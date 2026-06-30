// Tiny DOM helpers — no framework, just ergonomic element creation + toasts/modals.

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "class" || k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "style") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
export function mount(node, ...children) { clear(node); for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(String(c))); return node; }

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function fmtDate(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function fmtMinutes(m) {
  m = Math.round(m);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function debounce(fn, ms = 250) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/* ---- Toasts ---- */
let toastWrap;
export function toast(message, type = "") {
  if (!toastWrap) { toastWrap = el("div", { class: "toasts" }); document.body.append(toastWrap); }
  const t = el("div", { class: `toast ${type}`, text: message });
  toastWrap.append(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, 2600);
}

/* ---- Modal ---- */
export function modal({ title, body, actions = [], onClose }) {
  const backdrop = el("div", { class: "modal-backdrop" });
  const close = () => { backdrop.remove(); onClose && onClose(); };
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });

  const foot = el("div", { class: "modal-foot" });
  for (const a of actions) {
    foot.append(el("button", {
      class: `btn ${a.class || ""}`,
      text: a.label,
      onClick: () => { const keep = a.onClick && a.onClick(); if (!keep) close(); },
    }));
  }

  const m = el("div", { class: "modal" }, [
    el("div", { class: "modal-head" }, [el("h3", { text: title }), el("button", { class: "btn icon ghost", html: "✕", onClick: close })]),
    el("div", { class: "modal-body" }, [body]),
    actions.length ? foot : null,
  ]);
  backdrop.append(m);
  document.body.append(backdrop);
  return { close, node: m };
}

export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    modal({
      title,
      body: el("p", { class: "muted", text: message }),
      onClose: () => resolve(false),
      actions: [
        { label: "Cancel", class: "ghost", onClick: () => resolve(false) },
        { label: "Confirm", class: "danger", onClick: () => resolve(true) },
      ],
    });
  });
}
