import { el, mount, fmtMinutes, toast } from "../ui.js";
import { loadData } from "../data.js";
import { progressRing, progressBar } from "../components.js";
import { overallProgress, subjectPct, computeStreak, minutesToday, minutesTotal } from "../progress.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function render(root, ctx) {
  const syllabus = await loadData("syllabus");
  const name = (ctx.store.user?.displayName || "Student").split(" ")[0];
  const op = overallProgress(ctx.profile, syllabus, ctx.subjects);

  const hero = el("div", { class: "hero" }, [
    el("span", { class: "hero-emoji", text: ctx.stream.icon }),
    el("h1", { text: `${greeting()}, ${name}! 👋` }),
    el("p", { text: `${ctx.stream.name} stream · Maharashtra HSC (Std. XII) · 2025-26` }),
  ]);

  // --- progress + stats row ---
  const statWrap = el("div", { class: "stack" });
  const ringCard = el("div", { class: "card center" }, [
    el("h3", { text: "Syllabus progress" }),
    progressRing(op.pct, { sub: `${op.done}/${op.total} chapters` }),
    el("p", { class: "muted", style: { marginTop: "8px" }, text: op.pct >= 100 ? "🎉 All chapters done — revise & practise papers!" : "Keep going — every chapter counts." }),
  ]);

  const statsCard = el("div", { class: "card" }, [el("h3", { text: "Study stats" }), statWrap]);
  // sessions stats load async
  ctx.store.listSessions().then((sessions) => {
    const streak = computeStreak(sessions);
    mount(statWrap,
      el("div", { class: "grid cols-2" }, [
        statBlock("🔥", streak, streak === 1 ? "day streak" : "days streak"),
        statBlock("⏱️", fmtMinutes(minutesToday(sessions)), "studied today"),
        statBlock("📚", sessions.length, "sessions logged"),
        statBlock("∑", fmtMinutes(minutesTotal(sessions)), "total focus time"),
      ]),
    );
  }).catch(() => mount(statWrap, el("p", { class: "muted", text: "No sessions yet." })));

  // --- today's tasks ---
  const tasksCard = el("div", { class: "card" });
  renderTasks(tasksCard, ctx);

  // --- subjects ---
  const subjGrid = el("div", { class: "grid cols-2" });
  for (const s of ctx.subjects) {
    const pct = subjectPct(ctx.profile, syllabus, s.id);
    const hasSyllabus = !!syllabus.subjects[s.id];
    subjGrid.append(
      el("div", { class: "subject-tile", onClick: () => ctx.navigate(`#/syllabus/${s.id}`) }, [
        el("span", { class: "em", text: s.icon }),
        el("div", { style: { flex: "1", minWidth: "0" } }, [
          el("div", { style: { fontWeight: "700" }, text: s.name }),
          hasSyllabus ? progressBar(pct) : el("small", { class: "faint", text: "Reference subject" }),
        ]),
        hasSyllabus ? el("span", { class: "chip brand", text: pct + "%" }) : null,
      ]),
    );
  }

  // --- quick links ---
  const quick = el("div", { class: "quick" }, [
    quickLink("⏱️", "Start timer", () => ctx.navigate("#/timer")),
    quickLink("🃏", "Flashcards", () => ctx.navigate("#/flashcards")),
    quickLink("🧮", "Formulas", () => ctx.navigate("#/formulas")),
    quickLink("📄", "Past papers", () => ctx.navigate("#/papers")),
    quickLink("📈", "GPA calc", () => ctx.navigate("#/calculator")),
    quickLink("📚", "Textbooks", () => ctx.navigate("#/textbooks")),
  ]);

  mount(root,
    hero,
    el("div", { class: "grid cols-2", style: { marginTop: "16px" } }, [ringCard, statsCard]),
    el("div", { class: "grid cols-2", style: { marginTop: "16px" } }, [
      tasksCard,
      el("div", { class: "card" }, [el("h3", { text: "Quick links" }), quick]),
    ]),
    el("h2", { style: { margin: "26px 0 12px" }, text: "Your subjects" }),
    subjGrid,
  );
}

function statBlock(emoji, value, label) {
  return el("div", { class: "stat" }, [
    el("div", { class: "big", html: `${emoji} ${value}` }),
    el("div", { class: "lbl", text: label }),
  ]);
}

function quickLink(emoji, label, onClick) {
  return el("button", { onClick }, [el("span", { class: "em", text: emoji }), el("span", { text: label })]);
}

function renderTasks(card, ctx) {
  const tasks = ctx.profile.tasks || [];
  const list = el("ul", { class: "tasklist" });

  const save = async (next) => {
    ctx.profile.tasks = next;
    await ctx.saveProfile({ tasks: next });
  };

  tasks.forEach((t, i) => {
    list.append(el("li", {}, [
      el("input", { type: "checkbox", checked: t.done, onChange: async (e) => { tasks[i].done = e.target.checked; await save(tasks); } }),
      el("span", { style: { flex: "1", textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-soft)" : "" }, text: t.text }),
      el("button", { class: "btn icon ghost sm", html: "✕", onClick: async () => { await save(tasks.filter((_, j) => j !== i)); renderTasks(card, ctx); } }),
    ]));
  });

  const input = el("input", { placeholder: "Add a task for today…", onKeydown: async (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const next = [...(ctx.profile.tasks || []), { text: e.target.value.trim(), done: false }];
      await save(next); renderTasks(card, ctx); toast("Task added", "ok");
    }
  }});

  mount(card,
    el("h3", { text: "📝 Today's tasks" }),
    tasks.length ? list : el("p", { class: "muted", text: "No tasks yet. Add one below 👇" }),
    el("div", { style: { marginTop: "10px" } }, [input]),
  );
}
