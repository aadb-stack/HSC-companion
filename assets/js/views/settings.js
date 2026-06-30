import { el, mount, toast, confirmDialog } from "../ui.js";
import { loadData } from "../data.js";
import { pageHead } from "../components.js";
import { setTheme, getTheme } from "../theme.js";
import { APP_CONFIG } from "../../../config.js";

export default async function render(root, ctx) {
  const version = await loadData("version");
  const user = ctx.store.user;

  // --- profile name ---
  const nameInput = el("input", { value: user?.displayName || "", placeholder: "Your name" });
  const profileCard = el("div", { class: "card" }, [
    el("h3", { text: "👤 Profile" }),
    el("div", { class: "field" }, [el("label", { text: "Display name" }), nameInput]),
    el("button", { class: "btn primary sm", html: "Save name", onClick: async () => {
      const n = nameInput.value.trim(); if (!n) return toast("Enter a name", "bad");
      await ctx.store.setDisplayName(n); toast("Saved", "ok");
    } }),
  ]);

  // --- stream ---
  const streamSel = el("select", {}, ctx.streams.streams.map((s) => el("option", { value: s.id, text: `${s.icon} ${s.name}`, selected: s.id === ctx.stream.id })));
  const streamCard = el("div", { class: "card" }, [
    el("h3", { text: "🎓 Stream" }),
    el("p", { class: "muted", text: "Switching stream changes your dashboard, subjects and syllabus." }),
    el("div", { class: "field" }, [streamSel]),
    el("button", { class: "btn primary sm", html: "Switch stream", onClick: async () => {
      await ctx.saveProfile({ stream: streamSel.value }); ctx.profile.stream = streamSel.value;
      toast("Stream updated", "ok"); ctx.reload();
    } }),
  ]);

  // --- appearance ---
  const themeBtns = ["light", "dark"].map((t) =>
    el("button", { class: "btn sm" + (getTheme() === t ? " primary" : ""), text: t === "light" ? "☀ Light" : "🌙 Dark",
      onClick: () => { setTheme(t); render(root, ctx); } }));
  const appearanceCard = el("div", { class: "card" }, [el("h3", { text: "🎨 Appearance" }), el("div", { class: "row" }, themeBtns)]);

  // --- account / sync ---
  let accountBody;
  if (ctx.store.cloud) {
    accountBody = el("div", {}, [
      el("p", { class: "muted", text: user?.isAnonymous ? "Signed in as a guest (anonymous). Your data syncs to the cloud but is tied to this browser unless you link an account." : `Signed in${user?.email ? " as " + user.email : ""}.` }),
      el("span", { class: "chip ok", text: "☁ Cloud sync ON" }),
      el("div", { style: { marginTop: "12px" } }, [
        el("button", { class: "btn danger sm", html: "Sign out", onClick: async () => { await ctx.store.signOut(); } }),
      ]),
    ]);
  } else {
    accountBody = el("div", {}, [
      el("p", { class: "muted", text: "You're in local mode — your data is saved on this device only. Add your free Firebase keys in firebase-config.js to turn on cloud sync across devices (see the README)." }),
      el("span", { class: "chip warn", text: "💾 Local mode" }),
    ]);
  }
  const accountCard = el("div", { class: "card" }, [el("h3", { text: "🔐 Account & sync" }), accountBody]);

  // --- feedback ---
  const feedbackCard = el("div", { class: "card" }, [
    el("h3", { text: "💬 Feedback & bugs" }),
    el("p", { class: "muted", text: "Spotted a wrong chapter, formula, or a bug? Tell us — it takes a minute." }),
    el("div", { class: "row" }, [
      el("a", { class: "btn sm", href: APP_CONFIG.NEW_ISSUE_URL, target: "_blank", rel: "noopener", html: "Open an issue ↗" }),
      el("a", { class: "btn sm ghost", href: APP_CONFIG.ISSUES_URL, target: "_blank", rel: "noopener", html: "Browse issues ↗" }),
    ]),
  ]);

  // --- data ---
  const dataCard = el("div", { class: "card" }, [
    el("h3", { text: "🗃️ Your data" }),
    el("div", { class: "row" }, [
      el("button", { class: "btn sm", html: "⬇ Export (JSON)", onClick: async () => {
        const data = { profile: await ctx.store.getProfile(), flashcards: await ctx.store.listFlashcards(), sessions: await ctx.store.listSessions(), exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = el("a", { href: URL.createObjectURL(blob), download: "hsc-study-hub-backup.json" });
        document.body.append(a); a.click(); a.remove(); toast("Backup downloaded", "ok");
      } }),
      el("button", { class: "btn sm danger", html: "Reset progress", onClick: async () => {
        if (await confirmDialog("Reset progress?", "This clears your syllabus progress and today's tasks. Flashcards are kept.")) {
          await ctx.saveProfile({ progress: {}, tasks: [] }); ctx.profile.progress = {}; ctx.profile.tasks = [];
          toast("Progress reset", "ok");
        }
      } }),
    ]),
  ]);

  const about = el("div", { class: "card center muted" }, [
    el("div", { text: `${version.name}` }),
    el("small", { text: `v${version.version} “${version.codename}” · ` }),
    el("a", { href: APP_CONFIG.REPO_URL, target: "_blank", rel: "noopener", text: "Source on GitHub ↗" }),
  ]);

  mount(root,
    pageHead("Settings", "Personalise your study hub."),
    el("div", { class: "grid cols-2" }, [profileCard, streamCard, appearanceCard, accountCard, feedbackCard, dataCard]),
    about,
  );
}
