// Reusable visual components built on the ui.el helper.
import { el } from "./ui.js";

let ringSeq = 0;

// Animated SVG progress ring. pct = 0..100
export function progressRing(pct, { size = 150, stroke = 14, sub = "complete" } = {}) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const gid = `ringgrad-${++ringSeq}`;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6c5ce7"/>
        <stop offset="100%" stop-color="#4f86f7"/>
      </linearGradient>
    </defs>
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
            stroke="url(#${gid})" stroke-width="${stroke}"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/>`;
  // animate in
  requestAnimationFrame(() => { svg.querySelector(".fill").setAttribute("stroke-dashoffset", offset); });

  return el("div", { class: "ring", style: { "--size": size + "px" } }, [
    svg,
    el("div", { class: "label" }, [
      el("div", { class: "pct", text: pct + "%" }),
      el("div", { class: "sub", text: sub }),
    ]),
  ]);
}

export function progressBar(pct) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  return el("div", { class: "bar" }, [el("span", { style: { width: pct + "%" } })]);
}

export function pageHead(title, subtitle, right) {
  return el("div", { class: "page-head" }, [
    el("div", {}, [el("h1", { text: title }), subtitle ? el("p", { text: subtitle }) : null]),
    right || null,
  ]);
}

export function emptyState(emoji, text, action) {
  return el("div", { class: "empty card" }, [
    el("span", { class: "em", text: emoji }),
    el("div", { text }),
    action || null,
  ]);
}
