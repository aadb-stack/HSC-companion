import { el, mount, toast } from "../ui.js";
import { loadData } from "../data.js";
import { progressBar, pageHead } from "../components.js";
import { chapterCount, doneList, subjectPct, overallProgress } from "../progress.js";

export default async function render(root, ctx) {
  const syllabus = await loadData("syllabus");
  const focus = ctx.route.params[0];

  const op = overallProgress(ctx.profile, syllabus, ctx.subjects);
  const head = pageHead("Syllabus tracker", `${op.done} of ${op.total} chapters completed — ${op.pct}% of your ${ctx.stream.name} syllabus.`,
    el("span", { class: "chip brand", text: op.pct + "% overall" }));

  const wrap = el("div", { class: "stack" });

  for (const subject of ctx.subjects) {
    const meta = syllabus.subjects[subject.id];
    if (!meta) continue;
    wrap.append(buildSubject(ctx, subject, meta, focus === subject.id));
  }

  mount(root, head, wrap);
}

function buildSubject(ctx, subject, meta, open) {
  const total = meta.chapters.length;
  const done = new Set(doneList(ctx.profile, subject.id));
  const pct = () => Math.round((done.size / total) * 100);

  const pctChip = el("span", { class: "chip brand", text: pct() + "%" });
  const bar = progressBar((done.size / total) * 100);

  const body = el("div", { class: "acc-body" });
  meta.chapters.forEach((name, idx) => {
    const row = el("div", { class: "chap" + (done.has(idx) ? " done" : "") }, [
      el("span", { class: "num", text: idx + 1 }),
      el("span", { class: "name", text: name }),
      el("input", { class: "cb", type: "checkbox", checked: done.has(idx) }),
    ]);
    const cb = row.querySelector(".cb");
    cb.addEventListener("change", async () => {
      if (cb.checked) { done.add(idx); row.classList.add("done"); }
      else { done.delete(idx); row.classList.remove("done"); }
      // update header bits
      bar.querySelector("span").style.width = (done.size / total) * 100 + "%";
      pctChip.textContent = pct() + "%";
      // persist
      const progress = { ...(ctx.profile.progress || {}) };
      progress[subject.id] = [...done].sort((a, b) => a - b);
      ctx.profile.progress = progress;
      await ctx.saveProfile({ progress });
    });
    body.append(row);
  });

  const acc = el("div", { class: "accordion" + (open ? " open" : "") }, [
    el("div", { class: "acc-head" }, [
      el("div", { class: "row", style: { gap: "10px" } }, [el("span", { text: subject.icon }), el("span", { text: subject.name })]),
      el("div", { class: "row", style: { gap: "10px" } }, [pctChip, el("span", { class: "caret", html: "▶" })]),
    ]),
    el("div", { style: { padding: "0 16px 6px" } }, [bar]),
    body,
  ]);
  acc.querySelector(".acc-head").addEventListener("click", (e) => {
    if (e.target.closest(".cb")) return;
    acc.classList.toggle("open");
  });
  if (open) setTimeout(() => acc.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  return acc;
}
