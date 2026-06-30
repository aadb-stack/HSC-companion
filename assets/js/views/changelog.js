import { el, mount, fmtDate } from "../ui.js";
import { loadData } from "../data.js";
import { pageHead } from "../components.js";
import { APP_CONFIG } from "../../../config.js";

export default async function render(root, ctx) {
  const version = await loadData("version");

  const head = pageHead("What's new", `You're running v${version.version} “${version.codename}”.`,
    el("a", { class: "btn sm", href: `${APP_CONFIG.REPO_URL}/releases`, target: "_blank", rel: "noopener", html: "All releases ↗" }));

  const wrap = el("div", { class: "stack" }, [el("div", { class: "card muted", text: "Loading release notes…" })]);
  mount(root, head, wrap);

  try {
    const res = await fetch(APP_CONFIG.RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error("releases " + res.status);
    const releases = await res.json();
    if (Array.isArray(releases) && releases.length) {
      mount(wrap, ...releases.map((r) => el("div", { class: "card" }, [
        el("div", { class: "row between" }, [
          el("h3", { style: { margin: "0" }, text: r.name || r.tag_name }),
          el("span", { class: "chip brand", text: r.tag_name }),
        ]),
        el("small", { class: "faint", text: "Released " + fmtDate(Date.parse(r.published_at)) }),
        el("div", { class: "stack", style: { marginTop: "10px" } }, [renderBody(r.body)]),
      ])));
      return;
    }
    throw new Error("no releases");
  } catch (e) {
    // graceful fallback — the repo may not have published Releases yet
    mount(wrap,
      el("div", { class: "card" }, [
        el("div", { class: "row between" }, [el("h3", { style: { margin: 0 }, text: `${version.name} ${version.version}` }), el("span", { class: "chip brand", text: "v" + version.version })]),
        el("small", { class: "faint", text: "Released " + fmtDate(Date.parse(version.released)) }),
        el("ul", { style: { marginTop: "10px" } }, [
          el("li", { text: "First public release 🎉" }),
          el("li", { text: "Dashboard, syllabus tracker, formula sheet, flashcards, Pomodoro timer." }),
          el("li", { text: "Textbook library & previous-year papers (official links)." }),
          el("li", { text: "GPA / percentage calculator, dark & light themes." }),
        ]),
      ]),
      el("div", { class: "card muted" }, [
        "Release notes are pulled live from GitHub Releases. Once the maintainer publishes a release, it appears here automatically. ",
        el("a", { href: `${APP_CONFIG.REPO_URL}/releases`, target: "_blank", rel: "noopener", text: "View on GitHub ↗" }),
      ]),
    );
  }
}

// very small Markdown-ish renderer for release bodies (lists + line breaks)
function renderBody(body) {
  const box = el("div");
  if (!body) { box.append(el("p", { class: "muted", text: "No notes." })); return box; }
  const lines = body.split(/\r?\n/);
  let ul = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { ul = null; continue; }
    if (/^[-*]\s+/.test(t)) {
      if (!ul) { ul = el("ul"); box.append(ul); }
      ul.append(el("li", { text: t.replace(/^[-*]\s+/, "") }));
    } else if (/^#{1,6}\s/.test(t)) {
      ul = null; box.append(el("h4", { text: t.replace(/^#{1,6}\s/, "") }));
    } else {
      ul = null; box.append(el("p", { style: { margin: "4px 0" }, text: t }));
    }
  }
  return box;
}
