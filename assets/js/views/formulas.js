import { el, mount, debounce } from "../ui.js";
import { loadData } from "../data.js";
import { pageHead } from "../components.js";

export default async function render(root, ctx) {
  const data = await loadData("formulas");
  const available = Object.keys(data.subjects);
  // prefer subjects in the student's stream, else show everything available
  const mine = ctx.subjects.map((s) => s.id).filter((id) => available.includes(id));
  const subjects = mine.length ? mine : available;

  let active = ctx.route.params[0] && subjects.includes(ctx.route.params[0]) ? ctx.route.params[0] : subjects[0];
  let queryStr = "";

  const tabs = el("div", { class: "row", style: { gap: "8px", flexWrap: "wrap" } });
  const search = el("input", { type: "search", placeholder: "Search formulas (e.g. 'Bernoulli', 'pH', 'integration')…" });
  const listWrap = el("div", { class: "stack", style: { marginTop: "14px" } });

  function drawTabs() {
    mount(tabs, ...subjects.map((id) =>
      el("button", { class: "btn sm" + (id === active ? " primary" : ""), text: data.subjects[id].name,
        onClick: () => { active = id; drawTabs(); drawList(); } })));
  }

  function drawList() {
    const subj = data.subjects[active];
    const q = queryStr.trim().toLowerCase();
    const topics = subj.topics
      .map((t) => ({ topic: t.topic, formulas: t.formulas.filter((f) =>
        !q || f.name.toLowerCase().includes(q) || f.expr.toLowerCase().includes(q) || (f.desc || "").toLowerCase().includes(q)) }))
      .filter((t) => t.formulas.length);

    if (!topics.length) { mount(listWrap, el("div", { class: "empty card" }, [el("span", { class: "em", text: "🔍" }), `No formulas match “${queryStr}”.`])); return; }

    mount(listWrap, ...topics.map((t, i) => {
      const body = el("div", { class: "acc-body" }, t.formulas.map((f) =>
        el("div", { class: "formula" }, [
          el("div", { class: "fname", text: f.name }),
          el("div", { class: "fexpr", text: f.expr }),
          f.desc ? el("div", { class: "fdesc", text: f.desc }) : null,
        ])));
      const acc = el("div", { class: "accordion" + (q || i === 0 ? " open" : "") }, [
        el("div", { class: "acc-head" }, [
          el("span", { text: t.topic }),
          el("div", { class: "row", style: { gap: "8px" } }, [el("span", { class: "chip", text: t.formulas.length }), el("span", { class: "caret", html: "▶" })]),
        ]),
        body,
      ]);
      acc.querySelector(".acc-head").addEventListener("click", () => acc.classList.toggle("open"));
      return acc;
    }));
  }

  search.addEventListener("input", debounce((e) => { queryStr = e.target.value; drawList(); }, 180));

  drawTabs(); drawList();
  mount(root,
    pageHead("Formula sheet", "Quick-reference HSC formulas. Tap a topic to expand. Always cross-check with your textbook."),
    el("div", { class: "card tight" }, [tabs]),
    search,
    listWrap,
  );
}
