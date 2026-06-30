// Dark / light theme with persistence + system-preference default.
const KEY = "hsc:theme";

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (prefersDark ? "dark" : "light"));
}

export function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(KEY, t);
}

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
  return getTheme();
}
