// =============================================================================
//  app.js — boot, auth flow, onboarding, app shell and the hash router.
// =============================================================================
import { store } from "./store.js";
import { loadData } from "./data.js";
import { el, mount, clear, toast } from "./ui.js";
import { initTheme, toggleTheme, getTheme } from "./theme.js";
import { openSearch } from "./search.js";
import { APP_CONFIG } from "../../config.js";

const appRoot = document.getElementById("app-root");

const NAV = [
  { name: "dashboard", label: "Dashboard", icon: "🏠", hash: "#/" },
  { name: "syllabus", label: "Syllabus", icon: "✅", hash: "#/syllabus" },
  { name: "formulas", label: "Formula sheet", icon: "🧮", hash: "#/formulas" },
  { name: "flashcards", label: "Flashcards", icon: "🃏", hash: "#/flashcards" },
  { name: "timer", label: "Pomodoro", icon: "⏱️", hash: "#/timer" },
  { name: "textbooks", label: "Textbooks", icon: "📚", hash: "#/textbooks" },
  { name: "papers", label: "Past papers", icon: "📄", hash: "#/papers" },
  { name: "calculator", label: "GPA calculator", icon: "📈", hash: "#/calculator" },
];
const NAV_MORE = [
  { name: "changelog", label: "What's new", icon: "✨", hash: "#/changelog" },
  { name: "settings", label: "Settings", icon: "⚙️", hash: "#/settings" },
];

const ROUTES = {
  dashboard: () => import("./views/dashboard.js"),
  syllabus: () => import("./views/syllabus.js"),
  formulas: () => import("./views/formulas.js"),
  flashcards: () => import("./views/flashcards.js"),
  timer: () => import("./views/pomodoro.js"),
  textbooks: () => import("./views/textbooks.js"),
  papers: () => import("./views/papers.js"),
  calculator: () => import("./views/calculator.js"),
  changelog: () => import("./views/changelog.js"),
  settings: () => import("./views/settings.js"),
};
const TITLES = Object.fromEntries([...NAV, ...NAV_MORE].map((n) => [n.name, n.label]));

const ctx = {
  store,
  streams: null,
  profile: {},
  stream: null,
  subjects: [],
  subjectsById: {},
  route: { name: "dashboard", params: [] },
  navigate(hash) { if (location.hash === hash) handleRoute(); else location.hash = hash; },
  async saveProfile(patch) { Object.assign(ctx.profile, patch); await store.saveProfile(patch); },
  reload() { deriveStream(); enterApp(); },
};

let shellBuilt = false;
let viewCleanup = null;
let profileUnsub = null;

/* ---------------------------------------------------------------- boot ---- */
async function boot() {
  initTheme();
  renderLoading("Starting up…");
  try {
    ctx.streams = await loadData("streams");
    ctx.subjectsById = {};
    for (const s of ctx.streams.streams) for (const sub of s.subjects) ctx.subjectsById[sub.id] = sub;
    await store.init();
    store.onAuth(onAuth);
  } catch (err) {
    console.error(err);
    renderLoading("⚠ Failed to load. Check your connection and refresh.");
  }
}

async function onAuth(user) {
  // cloud mode with nobody signed in → show the sign-in screen
  if (store.cloud && !user) { teardown(); renderAuth(); return; }

  ctx.profile = (await store.getProfile()) || {};
  if (profileUnsub) profileUnsub();
  profileUnsub = store.onProfile((p) => { ctx.profile = p || {}; });

  if (!ctx.profile.stream) { renderOnboarding(); return; }
  deriveStream();
  enterApp();
}

function deriveStream() {
  ctx.stream = ctx.streams.streams.find((s) => s.id === ctx.profile.stream) || ctx.streams.streams[0];
  ctx.subjects = ctx.stream.subjects;
}

function teardown() {
  shellBuilt = false;
  if (viewCleanup) { try { viewCleanup(); } catch {} viewCleanup = null; }
}

/* ----------------------------------------------------------- loading ------ */
function renderLoading(msg) {
  mount(appRoot, el("div", { class: "center", style: { display: "grid", placeItems: "center", minHeight: "100vh", gap: "12px" } }, [
    el("div", { class: "brand", style: { fontSize: "1.4rem" } }, [el("span", { class: "logo", text: "🎓" }), el("span", { text: "HSC Study Hub" })]),
    el("p", { class: "muted", text: msg || "Loading…" }),
  ]));
}

/* ------------------------------------------------------------- auth -------- */
function renderAuth() {
  const email = el("input", { type: "email", placeholder: "you@example.com" });
  const pw = el("input", { type: "password", placeholder: "Password (min 6 chars)" });
  const name = el("input", { placeholder: "Your name" });
  let mode = "signin";
  const nameField = el("div", { class: "field hidden" }, [el("label", { text: "Name" }), name]);
  const err = el("p", { class: "muted", style: { color: "var(--bad)" } });

  const run = (fn) => fn.catch((e) => { err.textContent = friendlyAuthError(e); });

  const submit = el("button", { class: "btn primary", style: { width: "100%" }, onClick: () => {
    err.textContent = "";
    if (mode === "signup") run(store.signUpEmail(email.value.trim(), pw.value, name.value.trim()));
    else run(store.signInEmail(email.value.trim(), pw.value));
  } });

  const toggle = el("a", { href: "#", onClick: (e) => {
    e.preventDefault();
    mode = mode === "signin" ? "signup" : "signin";
    nameField.classList.toggle("hidden", mode !== "signup");
    submit.textContent = mode === "signup" ? "Create account" : "Sign in";
    toggleLine.lastChild.textContent = mode === "signup" ? " Sign in" : " Create one";
    toggleLine.firstChild.textContent = mode === "signup" ? "Already have an account?" : "New here?";
  } });
  const toggleLine = el("p", { class: "muted center" }, [el("span", { text: "New here?" }), toggle]);
  toggle.textContent = " Create one";
  submit.textContent = "Sign in";

  const card = el("div", { class: "card", style: { width: "100%", maxWidth: "400px" } }, [
    el("div", { class: "brand", style: { justifyContent: "center", fontSize: "1.2rem" } }, [el("span", { class: "logo", text: "🎓" }), el("span", {}, ["HSC Study Hub", el("small", { text: "Maharashtra Board · Std. XII" })])]),
    el("button", { class: "btn", style: { width: "100%" }, html: "🔓 Continue with Google", onClick: () => run(store.signInGoogle()) }),
    el("div", { class: "center muted", style: { margin: "12px 0" }, text: "— or —" }),
    nameField,
    el("div", { class: "field" }, [el("label", { text: "Email" }), email]),
    el("div", { class: "field" }, [el("label", { text: "Password" }), pw]),
    submit,
    err,
    el("button", { class: "btn ghost", style: { width: "100%", marginTop: "6px" }, html: "Continue as guest →", onClick: () => run(store.signInGuest()) }),
    toggleLine,
  ]);

  mount(appRoot, el("div", { style: { display: "grid", placeItems: "center", minHeight: "100vh", padding: "20px" } }, [card]));
}

function friendlyAuthError(e) {
  const m = (e && e.code) || "";
  if (m.includes("invalid-credential") || m.includes("wrong-password") || m.includes("user-not-found")) return "Wrong email or password.";
  if (m.includes("email-already-in-use")) return "That email already has an account — sign in instead.";
  if (m.includes("weak-password")) return "Password should be at least 6 characters.";
  if (m.includes("popup-closed")) return "Google sign-in was cancelled.";
  if (m.includes("operation-not-allowed")) return "This sign-in method isn't enabled in Firebase yet.";
  return (e && e.message) || "Something went wrong. Try again.";
}

/* -------------------------------------------------------- onboarding ------ */
function renderOnboarding() {
  teardown();
  const name = el("input", { placeholder: "What should we call you?", value: ctx.store.user?.displayName && ctx.store.user.displayName !== "Student" ? ctx.store.user.displayName : "" });

  const cards = ctx.streams.streams.map((s) =>
    el("div", { class: "card", style: { cursor: "pointer", borderTop: `4px solid ${s.color}` }, onClick: async () => {
      const n = name.value.trim();
      if (n) await store.setDisplayName(n);
      await store.saveProfile({ stream: s.id });
      ctx.profile.stream = s.id;
      toast(`Welcome to ${s.name}! 🎉`, "ok");
      deriveStream(); enterApp(); ctx.navigate("#/");
    } }, [
      el("div", { style: { fontSize: "2.4rem" }, text: s.icon }),
      el("h3", { text: s.name }),
      el("p", { class: "muted", text: s.description }),
      el("div", { class: "row", style: { flexWrap: "wrap", gap: "6px", marginTop: "6px" } }, s.subjects.slice(0, 5).map((su) => el("span", { class: "chip", text: su.name }))),
    ]));

  mount(appRoot, el("div", { style: { maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" } }, [
    el("div", { class: "center" }, [
      el("h1", { text: "Choose your stream" }),
      el("p", { class: "muted", text: "We'll tailor your dashboard, subjects and syllabus. You can change this anytime in Settings." }),
    ]),
    el("div", { class: "field", style: { maxWidth: "360px", margin: "16px auto" } }, [name]),
    el("div", { class: "grid cols-3", style: { marginTop: "10px" } }, cards),
  ]));
}

/* ------------------------------------------------------------ shell ------- */
function buildShell() {
  const navLinks = (items) => items.map((n) =>
    el("button", { class: "nav-link", dataset: { name: n.name }, onClick: () => { ctx.navigate(n.hash); closeMobileNav(); } },
      [el("span", { class: "ico", text: n.icon }), el("span", { text: n.label })]));

  const sidebar = el("aside", { class: "sidebar" }, [
    el("div", { class: "brand" }, [el("span", { class: "logo", text: "🎓" }), el("span", {}, ["HSC Study Hub", el("small", { text: "Maharashtra · Std. XII" })])]),
    ...navLinks(NAV),
    el("div", { class: "nav-section", text: "More" }),
    ...navLinks(NAV_MORE),
    el("div", { class: "sidebar-foot" }, [
      el("a", { class: "nav-link", href: APP_CONFIG.NEW_ISSUE_URL, target: "_blank", rel: "noopener" }, [el("span", { class: "ico", text: "💬" }), el("span", { text: "Send feedback" })]),
    ]),
  ]);

  const sectionTitle = el("strong", { style: { fontSize: "1.05rem" } });
  const themeBtn = el("button", { class: "btn icon", title: "Toggle theme", html: getTheme() === "dark" ? "☀" : "🌙", onClick: () => { themeBtn.innerHTML = toggleTheme() === "dark" ? "☀" : "🌙"; } });
  const userPill = el("div", { class: "userpill" }, [
    el("span", { class: "av", text: (ctx.store.user?.displayName || "S").trim().charAt(0).toUpperCase() }),
    el("span", { text: (ctx.store.user?.displayName || "Student").split(" ")[0] }),
  ]);

  const searchBtn = el("button", { class: "btn icon", title: "Search (press /)", html: "🔎", onClick: () => openSearch(ctx) });

  const topbar = el("header", { class: "topbar" }, [
    el("button", { class: "btn icon ghost hamburger", html: "☰", onClick: () => appShell.classList.toggle("nav-open") }),
    sectionTitle,
    el("span", { class: "spacer" }),
    el("span", { class: "chip", text: ctx.stream.icon + " " + ctx.stream.name }),
    searchBtn,
    themeBtn,
    userPill,
  ]);

  const view = el("main", { class: "content", id: "view" });
  const scrim = el("div", { class: "scrim", onClick: closeMobileNav });
  const main = el("div", { class: "main" }, [topbar, view, scrim]);

  const appShell = el("div", { class: "app" }, [sidebar, main]);
  ctx._sectionTitle = sectionTitle;
  ctx._shell = appShell;
  mount(appRoot, appShell);
  shellBuilt = true;
}

function closeMobileNav() { ctx._shell && ctx._shell.classList.remove("nav-open"); }

function highlightNav(name) {
  document.querySelectorAll(".nav-link[data-name]").forEach((b) => b.classList.toggle("active", b.dataset.name === name));
  if (ctx._sectionTitle) ctx._sectionTitle.textContent = TITLES[name] || "Dashboard";
}

/* ------------------------------------------------------------ router ------ */
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const name = ROUTES[parts[0]] ? parts[0] : "dashboard";
  return { name, params: parts.slice(1) };
}

async function handleRoute() {
  if (!shellBuilt) return;
  const route = parseHash();
  ctx.route = route;
  highlightNav(route.name);

  if (viewCleanup) { try { viewCleanup(); } catch {} viewCleanup = null; }

  const view = document.getElementById("view");
  mount(view, el("div", { class: "card muted", text: "Loading…" }));
  try {
    const mod = await ROUTES[route.name]();
    clear(view);
    const cleanup = await mod.default(view, ctx);
    viewCleanup = typeof cleanup === "function" ? cleanup : null;
  } catch (err) {
    console.error(err);
    mount(view, el("div", { class: "card" }, [el("h3", { text: "Couldn't load this page" }), el("p", { class: "muted", text: String(err.message || err) })]));
  }
  window.scrollTo(0, 0);
}

function enterApp() {
  buildShell();
  if (!window._hscRouteBound) {
    window.addEventListener("hashchange", handleRoute);
    // "/" opens global search (unless typing in a field)
    window.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) {
        e.preventDefault(); if (shellBuilt) openSearch(ctx);
      }
    });
    window._hscRouteBound = true;
  }
  handleRoute();
}

boot();
