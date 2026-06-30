import { el, mount } from "../ui.js";
import { loadData } from "../data.js";
import { pageHead } from "../components.js";

export default async function render(root, ctx) {
  const data = await loadData("papers");
  let showAll = false;

  const info = el("div", { class: "card" }, [
    el("h3", { text: "🏛️ Official board sources" }),
    el("p", { class: "muted", text: data.meta.important }),
    el("div", { class: "quick", style: { marginTop: "10px" } }, data.meta.officialPortals.map((p) =>
      el("a", { href: p.url, target: "_blank", rel: "noopener" }, [el("span", { class: "em", text: "🔗" }), el("span", { text: p.name })]))),
    el("p", { class: "faint", style: { marginTop: "10px", fontSize: ".82rem" }, text: data.meta.note }),
  ]);

  const listWrap = el("div", { class: "stack" });

  function draw() {
    const ids = showAll ? Object.keys(data.subjects) : ctx.subjects.map((s) => s.id).filter((id) => data.subjects[id]);
    const seen = new Set();
    mount(listWrap, ...ids.filter((id) => !seen.has(id) && seen.add(id)).map((id) => {
      const s = data.subjects[id];
      const icon = ctx.subjectsById[id]?.icon || "📘";
      return el("div", { class: "card" }, [
        el("div", { class: "row between" }, [
          el("h3", { style: { margin: "0" }, text: `${icon} ${s.name}` }),
          el("a", { class: "btn primary sm", href: s.portal, target: "_blank", rel: "noopener", html: "Board portal ↗" }),
        ]),
        el("div", { class: "row", style: { gap: "8px", marginTop: "10px", flexWrap: "wrap" } },
          data.meta.years.map((y) => el("a", { class: "chip", href: s.portal, target: "_blank", rel: "noopener", text: `March ${y}` }))),
        el("div", { class: "row", style: { gap: "10px", marginTop: "10px", flexWrap: "wrap" } },
          s.resources.map((rs) => el("a", { class: "btn sm ghost", href: rs.url, target: "_blank", rel: "noopener", text: rs.label + " ↗" }))),
      ]);
    }));
  }

  const toggle = el("button", { class: "btn sm", onClick: () => { showAll = !showAll; toggle.textContent = showAll ? "Show my stream only" : "Show all subjects"; draw(); }, text: "Show all subjects" });

  draw();
  mount(root,
    pageHead("Previous year papers", "Official MSBSHSE question papers, organised by subject and year. Links open the board's portals.", toggle),
    info,
    el("h2", { style: { margin: "22px 0 12px" }, text: "Papers by subject" }),
    listWrap,
  );
}
