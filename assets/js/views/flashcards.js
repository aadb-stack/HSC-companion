import { el, mount, modal, toast, confirmDialog } from "../ui.js";
import { pageHead, emptyState } from "../components.js";

export default async function render(root, ctx) {
  const subjects = ctx.subjects;
  const subjMap = Object.fromEntries(subjects.map((s) => [s.id, s]));
  let cards = [];
  let filter = "all";

  const grid = el("div", { class: "grid cols-3" });
  const filterRow = el("div", { class: "row", style: { gap: "8px", flexWrap: "wrap" } });

  const newBtn = el("button", { class: "btn primary", html: "＋ New card", onClick: () => openForm() });
  const studyBtn = el("button", { class: "btn", html: "🎴 Study", onClick: () => startStudy() });

  function drawFilters() {
    const ids = ["all", ...new Set(cards.map((c) => c.subject).filter(Boolean))];
    mount(filterRow, ...ids.map((id) =>
      el("button", { class: "btn sm" + (id === filter ? " primary" : ""),
        text: id === "all" ? `All (${cards.length})` : `${subjMap[id]?.icon || "📘"} ${subjMap[id]?.name || id}`,
        onClick: () => { filter = id; drawGrid(); drawFilters(); } })));
  }

  function visible() { return filter === "all" ? cards : cards.filter((c) => c.subject === filter); }

  function drawGrid() {
    const vis = visible();
    if (!vis.length) { mount(grid, emptyState("🃏", "No flashcards yet. Create your first one!", el("button", { class: "btn primary", html: "＋ New card", onClick: () => openForm() }))); return; }
    mount(grid, ...vis.map((card) => {
      const fc = el("div", { class: "flashcard" }, [
        el("div", { class: "flashcard-inner" }, [
          el("div", { class: "flashcard-face" }, [el("span", { class: "tag", text: subjMap[card.subject]?.name || "Card" }), el("div", { text: card.front })]),
          el("div", { class: "flashcard-face flashcard-back" }, [el("span", { class: "tag", text: "Answer" }), el("div", { text: card.back })]),
        ]),
      ]);
      fc.addEventListener("click", () => fc.classList.toggle("flipped"));
      const del = el("button", { class: "btn icon ghost sm", html: "🗑", title: "Delete",
        onClick: async (e) => { e.stopPropagation(); if (await confirmDialog("Delete card?", "This flashcard will be removed.")) { await ctx.store.deleteFlashcard(card.id); toast("Card deleted"); } } });
      return el("div", {}, [fc, el("div", { class: "row between", style: { marginTop: "6px" } }, [el("span", { class: "chip", text: "Box " + (card.box || 1) }), del])]);
    }));
  }

  function openForm() {
    const front = el("textarea", { rows: "2", placeholder: "Question / term" });
    const back = el("textarea", { rows: "3", placeholder: "Answer / definition" });
    const subjSel = el("select", {}, subjects.map((s) => el("option", { value: s.id, text: s.name })));
    modal({
      title: "New flashcard",
      body: el("div", {}, [
        el("div", { class: "field" }, [el("label", { text: "Subject" }), subjSel]),
        el("div", { class: "field" }, [el("label", { text: "Front" }), front]),
        el("div", { class: "field" }, [el("label", { text: "Back" }), back]),
      ]),
      actions: [
        { label: "Cancel", class: "ghost" },
        { label: "Save card", class: "primary", onClick: () => {
            if (!front.value.trim() || !back.value.trim()) { toast("Fill both sides", "bad"); return true; }
            ctx.store.addFlashcard({ front: front.value.trim(), back: back.value.trim(), subject: subjSel.value }).then(() => toast("Flashcard added", "ok"));
          } },
      ],
    });
  }

  function startStudy() {
    const deck = visible().slice().sort((a, b) => (a.box || 1) - (b.box || 1));
    if (!deck.length) { toast("No cards to study", "bad"); return; }
    let i = 0, flipped = false;
    const face = el("div", { class: "flashcard", style: { height: "260px" } });
    const counter = el("div", { class: "muted center", style: { marginBottom: "10px" } });

    function show() {
      flipped = false;
      const card = deck[i];
      counter.textContent = `Card ${i + 1} of ${deck.length} · ${subjMap[card.subject]?.name || ""}`;
      mount(face, el("div", { class: "flashcard-inner" }, [
        el("div", { class: "flashcard-face" }, [el("span", { class: "tag", text: "Question" }), el("div", { text: card.front })]),
        el("div", { class: "flashcard-face flashcard-back" }, [el("span", { class: "tag", text: "Answer" }), el("div", { text: card.back })]),
      ]));
      face.classList.remove("flipped");
    }
    face.addEventListener("click", () => { flipped = !flipped; face.classList.toggle("flipped"); });

    const next = (knew) => {
      const card = deck[i];
      const box = knew ? Math.min((card.box || 1) + 1, 5) : 1;
      ctx.store.updateFlashcard(card.id, { box });
      if (i + 1 >= deck.length) { ctrl.close(); toast("Deck complete! 🎉", "ok"); return; }
      i++; show();
    };

    const ctrl = modal({
      title: "Study session",
      body: el("div", {}, [
        counter, face,
        el("p", { class: "muted center", style: { margin: "10px 0 0" }, text: "Tap the card to flip it." }),
      ]),
      actions: [
        { label: "↺ Review again", class: "ghost", onClick: () => { next(false); return true; } },
        { label: "✓ I knew it", class: "ok", onClick: () => { next(true); return true; } },
      ],
    });
    show();
  }

  mount(root,
    pageHead("Flashcards", ctx.store.cloud ? "Synced to your account across devices." : "Saved on this device. Sign in (cloud mode) to sync.",
      el("div", { class: "row" }, [studyBtn, newBtn])),
    el("div", { class: "card tight", style: { marginBottom: "14px" } }, [filterRow]),
    grid,
  );

  const unsub = ctx.store.onFlashcards((list) => { cards = list; drawFilters(); drawGrid(); });
  return unsub; // cleanup on navigate
}
