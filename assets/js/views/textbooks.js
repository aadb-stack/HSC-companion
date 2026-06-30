import { el, mount, fmtDate } from "../ui.js";
import { loadData } from "../data.js";
import { pageHead } from "../components.js";

function fmtCheck(board) {
  const iso = board?.meta?.lastChecked;
  const t = iso ? Date.parse(iso) : 0;
  return t ? fmtDate(t) : "not yet";
}

export default async function render(root, ctx) {
  const data = await loadData("textbooks");
  let board = null;
  try { board = await loadData("board-links"); } catch { /* optional */ }
  let showAll = false;

  const verified = el("div", { class: "card tight", style: { marginBottom: "14px", borderLeft: "4px solid var(--ok)" } }, [
    el("div", { class: "row between" }, [
      el("span", { class: "muted", html: "🔄 Official links last verified by automation: <strong>" + fmtCheck(board) + "</strong>" }),
      el("span", { class: "chip ok", text: board?.meta?.autoUpdated ? "auto-checked" : "seed" }),
    ]),
    ...(board?.notices?.length ? [el("div", { class: "stack", style: { marginTop: "8px" } },
      board.notices.slice(0, 3).map((n) => el("a", { class: "chip warn", href: n.url, target: "_blank", rel: "noopener", text: "🔔 " + n.name })))] : []),
  ]);

  const sources = el("div", { class: "card" }, [
    el("h3", { text: "📥 Official download portals" }),
    el("p", { class: "muted", text: data.meta.important }),
    el("div", { class: "quick", style: { marginTop: "10px" } }, data.officialSources.map((s) =>
      el("a", { href: s.url, target: "_blank", rel: "noopener" }, [el("span", { class: "em", text: "🔗" }), el("span", { text: s.name })]))),
  ]);

  const listWrap = el("div", { class: "stack" });

  function draw() {
    const ids = showAll ? Object.keys(data.subjects) : ctx.subjects.map((s) => s.id).filter((id) => data.subjects[id]);
    const seen = new Set();
    mount(listWrap, ...ids.filter((id) => !seen.has(id) && seen.add(id)).map((id) => {
      const t = data.subjects[id];
      const icon = ctx.subjectsById[id]?.icon || "📘";
      return el("div", { class: "card" }, [
        el("div", { class: "row between" }, [
          el("h3", { style: { margin: "0" }, text: `${icon} ${t.name}` }),
          el("a", { class: "btn primary sm", href: t.portal, target: "_blank", rel: "noopener", html: "Open portal ↗" }),
        ]),
        el("p", { class: "muted", style: { margin: "8px 0 0" }, text: t.textbook }),
        t.note ? el("p", { class: "faint", style: { margin: "4px 0 0", fontSize: ".82rem" }, text: "How to: " + t.note }) : null,
      ]);
    }));
  }

  const toggle = el("button", { class: "btn sm", onClick: () => { showAll = !showAll; toggle.textContent = showAll ? "Show my stream only" : "Show all subjects"; draw(); }, text: "Show all subjects" });

  draw();
  mount(root,
    pageHead("Textbook library", "Direct links to free, official Balbharati / Government of Maharashtra e-textbooks. No PDFs are hosted here.", toggle),
    verified,
    sources,
    el("h2", { style: { margin: "22px 0 12px" }, text: "Textbooks by subject" }),
    listWrap,
  );
}
