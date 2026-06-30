import { el, mount } from "../ui.js";
import { loadData } from "../data.js";
import { pageHead } from "../components.js";

export default async function render(root, ctx) {
  const grading = await loadData("grading");

  // seed rows from the student's stream subjects
  let rows = ctx.subjects.map((s) => ({ name: s.name, max: (s.marks?.theory || 0) + (s.marks?.practical || 0) || 100, got: "" }));

  const tbody = el("tbody");
  const resultCard = el("div", { class: "card center" });

  function divisionFor(pct) {
    return grading.divisions.find((d) => pct >= d.min && pct <= d.max) || grading.divisions[grading.divisions.length - 1];
  }
  function gradeFor(pct) {
    return grading.gradePoints.scale.find((g) => pct >= g.min) || grading.gradePoints.scale[grading.gradePoints.scale.length - 1];
  }

  function compute() {
    let totMax = 0, totGot = 0, gpSum = 0, gpCount = 0, anyFail = false;
    for (const r of rows) {
      const max = parseFloat(r.max) || 0;
      const got = r.got === "" ? null : parseFloat(r.got);
      if (!max || got == null || isNaN(got)) continue;
      totMax += max; totGot += got;
      const spct = (got / max) * 100;
      if (spct < grading.passingMarkPercent) anyFail = true;
      gpSum += gradeFor(spct).points; gpCount++;
    }
    const pct = totMax ? (totGot / totMax) * 100 : 0;
    const div = divisionFor(pct);
    const gpa = gpCount ? (gpSum / gpCount) : 0;

    mount(resultCard,
      el("h3", { text: "Result" }),
      el("div", { class: "stat", style: { alignItems: "center", margin: "6px 0 12px" } }, [
        el("div", { class: "big", style: { fontSize: "2.8rem" }, text: totMax ? pct.toFixed(2) + "%" : "—" }),
        el("div", { class: "lbl", text: totMax ? `${totGot} / ${totMax} marks` : "Enter your marks above" }),
      ]),
      totMax ? el("div", { class: "row", style: { justifyContent: "center", gap: "10px", flexWrap: "wrap" } }, [
        el("span", { class: "chip", style: { background: div.color, color: "#fff", borderColor: "transparent" }, text: div.name }),
        el("span", { class: "chip", text: "GPA " + gpa.toFixed(2) + " / 10" }),
        anyFail ? el("span", { class: "chip bad", text: "⚠ Below 35% in a subject" }) : el("span", { class: "chip ok", text: "All subjects passed" }),
      ]) : null,
      el("p", { class: "faint", style: { marginTop: "12px", fontSize: ".8rem" }, text: grading.meta.note }),
    );
  }

  function drawRows() {
    mount(tbody, ...rows.map((r, i) => {
      const gotIn = el("input", { type: "number", min: "0", value: r.got, placeholder: "0", style: { maxWidth: "110px" },
        onInput: (e) => { r.got = e.target.value; compute(); } });
      const maxIn = el("input", { type: "number", min: "1", value: r.max, style: { maxWidth: "90px" },
        onInput: (e) => { r.max = e.target.value; compute(); } });
      const nameIn = el("input", { value: r.name, onInput: (e) => { r.name = e.target.value; } });
      return el("tr", {}, [
        el("td", {}, [nameIn]),
        el("td", {}, [gotIn]),
        el("td", {}, [maxIn]),
        el("td", {}, [el("button", { class: "btn icon ghost sm", html: "✕", onClick: () => { rows.splice(i, 1); drawRows(); compute(); } })]),
      ]);
    }));
  }

  const addBtn = el("button", { class: "btn sm", html: "＋ Add subject", onClick: () => { rows.push({ name: "New subject", max: 100, got: "" }); drawRows(); } });
  const resetBtn = el("button", { class: "btn sm ghost", html: "Clear marks", onClick: () => { rows.forEach((r) => (r.got = "")); drawRows(); compute(); } });

  drawRows(); compute();

  // grade scale reference
  const scaleCard = el("div", { class: "card" }, [
    el("h3", { text: "Maharashtra HSC class boundaries" }),
    el("table", { class: "tbl" }, [
      el("thead", {}, [el("tr", {}, [el("th", { text: "Division" }), el("th", { text: "Percentage" })])]),
      el("tbody", {}, grading.divisions.map((d) => el("tr", {}, [
        el("td", {}, [el("span", { class: "chip", style: { background: d.color, color: "#fff", borderColor: "transparent" }, text: d.name })]),
        el("td", { text: d.max >= 100 ? `${d.min}% and above` : `${d.min}% – ${d.max}%` }),
      ]))),
    ]),
  ]);

  mount(root,
    pageHead("GPA / percentage calculator", "Enter your marks per subject. Uses the Maharashtra HSC marking scheme (theory + practical)."),
    el("div", { class: "grid cols-2" }, [
      el("div", { class: "card" }, [
        el("table", { class: "tbl" }, [
          el("thead", {}, [el("tr", {}, [el("th", { text: "Subject" }), el("th", { text: "Marks" }), el("th", { text: "Out of" }), el("th", { text: "" })])]),
          tbody,
        ]),
        el("div", { class: "row", style: { marginTop: "12px" } }, [addBtn, resetBtn]),
      ]),
      el("div", { class: "stack" }, [resultCard, scaleCard]),
    ]),
  );
}
