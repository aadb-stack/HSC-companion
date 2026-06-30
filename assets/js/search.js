// Global search — loads the CI-generated data/search-index.json once and
// filters it in a modal. Falls back to building an index from the live data
// files if the generated one isn't present yet (e.g. before CI first runs).
import { el, mount, modal, debounce } from "./ui.js";
import { loadData } from "./data.js";

let INDEX = null;

async function getIndex() {
  if (INDEX) return INDEX;
  try {
    const res = await fetch("data/search-index.json", { cache: "no-cache" });
    if (res.ok) { INDEX = (await res.json()).items || []; return INDEX; }
    throw new Error("no index");
  } catch {
    INDEX = await buildFallback();
    return INDEX;
  }
}

async function buildFallback() {
  const items = [];
  try {
    const [formulas, syllabus, textbooks, streams] = await Promise.all([
      loadData("formulas"), loadData("syllabus"), loadData("textbooks"), loadData("streams"),
    ]);
    const names = {};
    streams.streams.forEach((s) => s.subjects.forEach((su) => (names[su.id] = su.name)));
    for (const [sid, meta] of Object.entries(formulas.subjects))
      for (const t of meta.topics) for (const f of t.formulas)
        items.push({ type: "formula", subject: sid, subjectName: names[sid] || sid, title: f.name, sub: f.expr, hash: `#/formulas/${sid}` });
    for (const [sid, meta] of Object.entries(syllabus.subjects))
      for (const ch of meta.chapters)
        items.push({ type: "chapter", subject: sid, subjectName: names[sid] || sid, title: ch, sub: `${meta.name} · chapter`, hash: `#/syllabus/${sid}` });
    for (const [sid, meta] of Object.entries(textbooks.subjects))
      items.push({ type: "textbook", subject: sid, subjectName: names[sid] || sid, title: meta.textbook || meta.name, sub: "Official textbook", hash: "#/textbooks" });
  } catch { /* ignore */ }
  return items;
}

const ICONS = { formula: "🧮", chapter: "✅", textbook: "📚", paper: "📄" };

export async function openSearch(ctx) {
  const input = el("input", { type: "search", placeholder: "Search chapters, formulas, textbooks…", style: { marginBottom: "12px" } });
  const results = el("div", { class: "stack", style: { maxHeight: "50vh", overflowY: "auto" } });
  const ctrl = modal({ title: "🔎 Search", body: el("div", {}, [input, results]) });

  const index = await getIndex();

  const run = (q) => {
    q = q.trim().toLowerCase();
    if (!q) { mount(results, el("p", { class: "muted center", text: `Type to search ${index.length} items…` })); return; }
    const hits = index.filter((it) =>
      it.title.toLowerCase().includes(q) || (it.sub || "").toLowerCase().includes(q) || (it.subjectName || "").toLowerCase().includes(q)
    ).slice(0, 30);
    if (!hits.length) { mount(results, el("p", { class: "muted center", text: "No matches." })); return; }
    mount(results, ...hits.map((it) =>
      el("button", { class: "subject-tile", style: { width: "100%", textAlign: "left" }, onClick: () => { ctrl.close(); ctx.navigate(it.hash); } }, [
        el("span", { class: "em", text: ICONS[it.type] || "🔗" }),
        el("div", { style: { flex: "1", minWidth: "0" } }, [
          el("div", { style: { fontWeight: "700" }, text: it.title }),
          el("small", { class: "muted", text: `${it.subjectName} · ${it.type}` }),
        ]),
      ])));
  };

  input.addEventListener("input", debounce((e) => run(e.target.value), 120));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const first = results.querySelector("button"); if (first) first.click(); }
  });
  run("");
  setTimeout(() => input.focus(), 50);
}
