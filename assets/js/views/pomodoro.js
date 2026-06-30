import { el, mount, toast, fmtMinutes } from "../ui.js";
import { pageHead } from "../components.js";
import { minutesToday } from "../progress.js";

const MODES = {
  focus: { label: "Focus", min: 25, color: "#6c5ce7" },
  short: { label: "Short break", min: 5, color: "#34c98a" },
  long: { label: "Long break", min: 15, color: "#4f86f7" },
};

export default async function render(root, ctx) {
  const saved = ctx.profile.timer || {};
  let mode = "focus";
  let durations = { focus: saved.focus || 25, short: saved.short || 5, long: saved.long || 15 };
  let remaining = durations[mode] * 60;
  let running = false;
  let tick = null;
  let completedFocus = 0;

  const subjSel = el("select", { style: { maxWidth: "260px" } }, ctx.subjects.map((s) => el("option", { value: s.id, text: `${s.icon} ${s.name}` })));

  // ring
  const size = 260, stroke = 16, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.style.transform = "rotate(-90deg)";
  svg.innerHTML = `
    <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle id="pfill" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-linecap="round" stroke-width="${stroke}" stroke-dasharray="${circ}" stroke-dashoffset="0"/>`;
  const fill = svg.querySelector("#pfill");

  const display = el("div", { class: "timer-display" });
  const ringWrap = el("div", { class: "ring", style: { "--size": size + "px" } }, [svg, el("div", { class: "label" }, [display])]);

  const modeRow = el("div", { class: "timer-modes" });
  const startBtn = el("button", { class: "btn primary", style: { minWidth: "120px" } });
  const resetBtn = el("button", { class: "btn ghost", html: "Reset" });
  const statLine = el("p", { class: "muted center" });

  function paint() {
    const total = durations[mode] * 60;
    const m = Math.floor(remaining / 60), s = remaining % 60;
    display.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    fill.setAttribute("stroke", MODES[mode].color);
    fill.setAttribute("stroke-dashoffset", circ * (1 - remaining / total));
    startBtn.textContent = running ? "⏸ Pause" : "▶ Start";
    startBtn.classList.toggle("primary", !running);
    document.title = running ? `${display.textContent} · ${MODES[mode].label}` : "HSC Study Hub";
  }

  function drawModes() {
    mount(modeRow, ...Object.entries(MODES).map(([key, m]) =>
      el("button", { class: key === mode ? "active" : "", text: `${m.label} · ${durations[key]}m`,
        onClick: () => { switchMode(key); } })));
  }

  function switchMode(key) {
    stop();
    mode = key;
    remaining = durations[mode] * 60;
    drawModes(); paint();
  }

  function stop() { running = false; if (tick) clearInterval(tick); tick = null; paint(); }

  function start() {
    if (running) { stop(); return; }
    running = true; paint();
    tick = setInterval(() => {
      remaining--;
      if (remaining <= 0) { complete(); return; }
      paint();
    }, 1000);
  }

  async function complete() {
    stop();
    beep();
    if (mode === "focus") {
      completedFocus++;
      const subject = subjSel.value;
      await ctx.store.addSession({ subject, minutes: durations.focus, mode: "focus" });
      toast(`Nice! ${durations.focus} min of focus logged 🎯`, "ok");
      await refreshStats();
      switchMode(completedFocus % 4 === 0 ? "long" : "short");
    } else {
      toast("Break over — back to it! 💪");
      switchMode("focus");
    }
  }

  async function refreshStats() {
    try {
      const sessions = await ctx.store.listSessions();
      const todayFocus = sessions.filter((s) => s.mode === "focus" && new Date((s.at && s.at.toMillis ? s.at.toMillis() : s.at)).toDateString() === new Date().toDateString());
      statLine.textContent = `Today: ${todayFocus.length} focus sessions · ${fmtMinutes(minutesToday(sessions))} studied`;
    } catch { statLine.textContent = ""; }
  }

  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7);
      o.start(); o.stop(ac.currentTime + 0.72);
    } catch { /* audio not allowed; ignore */ }
  }

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", () => { remaining = durations[mode] * 60; stop(); });

  // custom focus length
  const lenInput = el("input", { type: "number", min: "5", max: "90", value: durations.focus, style: { width: "90px" } });
  lenInput.addEventListener("change", async () => {
    const v = Math.max(5, Math.min(90, parseInt(lenInput.value) || 25));
    durations.focus = v; lenInput.value = v;
    if (mode === "focus") { remaining = v * 60; stop(); }
    drawModes();
    await ctx.saveProfile({ timer: durations }); ctx.profile.timer = durations;
  });

  drawModes(); paint(); refreshStats();

  mount(root,
    pageHead("Pomodoro timer", "Focus in 25-minute sprints. Sessions are tagged by subject and logged to your stats."),
    el("div", { class: "card center" }, [
      modeRow,
      el("div", { style: { margin: "18px 0" } }, [ringWrap]),
      el("div", { class: "row", style: { justifyContent: "center", marginBottom: "14px" } }, [
        el("label", { style: { margin: "0 8px 0 0" }, text: "Studying:" }), subjSel,
      ]),
      el("div", { class: "row", style: { justifyContent: "center" } }, [startBtn, resetBtn]),
      statLine,
      el("div", { class: "row", style: { justifyContent: "center", marginTop: "8px" } }, [
        el("small", { class: "faint", text: "Focus length (min):" }), lenInput,
      ]),
    ]),
  );

  // cleanup on navigation away
  return () => { if (tick) clearInterval(tick); document.title = "HSC Study Hub"; };
}
