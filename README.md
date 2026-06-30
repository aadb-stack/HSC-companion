# 🎓 HSC 12th Maharashtra Board Study Hub

A free, modern, **GitHub-native** study companion for **Maharashtra State Board
Class 12 (HSC / Std. XII)** students — Science, Commerce **and** Arts.

It runs entirely on free GitHub + Firebase tiers: the website is hosted on
**GitHub Pages**, the automation runs on **GitHub Actions**, the study content
lives in **versioned JSON files** in this repo, and each student's private data
(progress, flashcards, notes) syncs through **Firebase Firestore**.

> **No software to install.** Everything is done in your web browser.
> The app even works **without** Firebase — it falls back to saving data on your
> device until you choose to turn on cloud sync.

🔗 **Live site (once Pages is enabled):**
`https://aadb-stack.github.io/HSC-companion/`

---

## ✨ What's inside

| Feature | What it does |
|---|---|
| 🏠 **Dashboard** | Greeting, syllabus progress ring, study streak & focus-time stats, today's task list, quick links. |
| ✅ **Syllabus tracker** | Real 2025-26 MSBSHSE chapter lists. Tick chapters off; progress % saves to your account. |
| 🧮 **Formula sheet** | Searchable, collapsible, accurate HSC Physics / Chemistry / Maths formulas (+ accounting ratios). |
| 🃏 **Flashcards** | Make your own cards; study them with a spaced-repetition (Leitner box) mode. |
| ⏱️ **Pomodoro timer** | 25-min focus sprints tagged by subject; every session is logged to your stats. |
| 📚 **Textbook library** | Direct links to the **official, free** Balbharati e-textbooks. (No PDFs are hosted here.) |
| 📄 **Past papers** | Official MSBSHSE question-paper portals, organised by subject and year. |
| 📈 **GPA / % calculator** | Uses the real Maharashtra HSC marking scheme and class boundaries. |
| 🔎 **Global search** | Press `/` to search every chapter, formula and textbook instantly. |
| 🌗 **Dark / light + mobile** | Modern study-app look, installable as a phone app (PWA). |

---

## 🚀 Part 1 — Put the website online (GitHub Pages)

You only need a few clicks. **No command line.**

1. Open this repository on GitHub in your browser.
2. Click the **⚙️ Settings** tab (top of the repo).
3. In the left sidebar, click **Pages**.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
   (Not "Deploy from a branch".)
5. That's it. Now go to the **Actions** tab. The **"CI & Deploy to Pages"**
   workflow runs automatically on every push to `main` — when it finishes
   (green ✓), your site is live at
   `https://<your-username>.github.io/<your-repo-name>/`.

> 🛠️ **If you forked/renamed the repo:** open the file **`config.js`** (click it
> in GitHub, then the ✏️ pencil) and change `REPO_OWNER` and `REPO_NAME` to your
> own. This makes the in-app feedback links and "What's new" page point at your
> repo. Click **Commit changes** — the site redeploys by itself.

✅ **The app is now fully usable.** It will save your progress on your device.
To sync across phone + laptop, do Part 2.

---

## ☁️ Part 2 — Turn on cloud sync (Firebase, free tier)

Firebase's free **"Spark"** plan is plenty for this app. ~5 minutes, all in the
browser. If you skip this, the app still works — it just won't sync between
devices.

### 2a. Create the Firebase project
1. Go to **https://console.firebase.google.com** and sign in with a Google account.
2. Click **Add project** → give it a name (e.g. `hsc-study-hub`) → keep clicking
   **Continue** (you can disable Google Analytics) → **Create project**.

### 2b. Register a Web app & copy the keys
3. On the project home, click the **`</>`** (Web) icon.
4. Give it a nickname → **Register app**.
5. Firebase shows a `firebaseConfig = { … }` block. **Keep this tab open** — you'll
   copy these values next.

### 2c. Paste the keys into the repo
6. Back on GitHub, open **`firebase-config.js`** → click the ✏️ pencil to edit.
7. Replace each `YOUR_…` placeholder with the matching value from Firebase
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
8. Click **Commit changes**.

> 🔐 **Is it safe to commit these keys?** Yes. Firebase web config values are
> **public by design** — your data is protected by *security rules* (next step),
> not by hiding the key. This is the standard, documented Firebase setup.

### 2d. Enable sign-in methods
9. In Firebase: **Build → Authentication → Get started**.
10. Under **Sign-in method**, enable:
    - **Anonymous** (powers the "Continue as guest" button)
    - **Email/Password**
    - **Google** (optional, but nice)

### 2e. Create the database & paste security rules
11. **Build → Firestore Database → Create database** → choose **Production mode** →
    pick a location → **Enable**.
12. Open the **Rules** tab. Delete what's there and paste the contents of
    **`firestore.rules`** from this repo → **Publish**.
    These rules make sure each student can read/write **only their own** data.

🎉 Done. Reload your site — you'll now get a sign-in screen and your data syncs
to the cloud.

---

## 🤖 Part 3 — What the GitHub Actions workflows do

This project uses GitHub Actions as its "backend". Four workflows live in
**`.github/workflows/`**:

### 1. `ci.yml` — CI & Deploy to Pages
- **Runs:** on every push to `main`, and on every pull request.
- **Does:**
  1. **Validates** every JSON file in `/data` with `scripts/validate_data.py`
     (catches typos, broken structure, non-official/broken links). A broken
     data file **fails the build**, so it can never reach the live site.
  2. **Builds** `data/search-index.json` with `scripts/build_search_index.py`
     (this is what the global `/` search uses).
  3. **Deploys** the site to GitHub Pages (only from `main`, never from a PR).

### 2. `check-board-updates.yml` — Official source watcher ⭐
- **Runs:** automatically once a day (and on-demand from the Actions tab).
- **Does:** fetches each official page listed in `data/board-links.json`
  (mahahsscboard.in, ebalbharati.in, cyberbalbharati.in, …), strips out scripts
  and HTML, and computes a fingerprint (hash) of the page text. It compares that
  with the fingerprint stored from last time:
  - **First run:** saves a baseline fingerprint.
  - **Page changed:** updates the file, adds a dated **notice**, and **commits**
    the change. The app then shows a 🔔 flag on the **Textbooks** page so students
    know the board may have posted something new.
  - **Nothing changed:** the script leaves the file untouched, so there's **no
    commit** on quiet days.
  - **A site is down:** that source is skipped — a flaky website never breaks the job.
- **Why it's useful:** the board occasionally posts new circulars, timetables or
  model papers. This gives you a hands-off "heads up" without anyone checking
  manually. (Detection is heuristic — it flags *that* a page changed, then a human
  decides if it matters.)

### 3. `study-reminder.yml` — Weekly reminder issues
- **Runs:** every Monday morning (≈08:00 IST), and on-demand.
- **Does:** opens a friendly **GitHub Issue** with a weekly study checklist, and
  closes last week's reminder to keep things tidy. Anyone who **Watches** the
  repo gets a notification — a free, zero-server reminder system.

### 4. `release.yml` — Publish releases
- **Runs:** when you push a version tag like `v1.1.0`.
- **Does:** creates a **GitHub Release** using the matching section of
  `CHANGELOG.md` as the notes. The in-app **"What's new"** page reads these
  releases live via the GitHub API, so app updates are versioned properly.
- **To cut a release:** add a section to `CHANGELOG.md`, then create a tag/release
  from the GitHub **Releases** page (or push a `v*` tag).

---

## 📂 Repository structure

```
HSC-companion/
├── index.html                 # App shell (single-page app)
├── config.js                  # Your repo owner/name (edit if you fork)
├── firebase-config.js         # Your Firebase web keys (public, see Part 2)
├── firestore.rules            # Copy/paste into Firebase to secure data
├── manifest.webmanifest       # PWA metadata
├── assets/
│   ├── css/styles.css         # All styling (themable, responsive)
│   ├── img/icon.svg           # App icon
│   └── js/
│       ├── app.js             # Boot, auth flow, router, app shell
│       ├── store.js           # Data layer: Firestore  ↔  localStorage fallback
│       ├── firebase.js        # Lazy Firebase init (CDN, no install)
│       ├── data.js            # Loads the /data JSON files
│       ├── search.js          # Global "/" search
│       ├── theme.js, ui.js, components.js, progress.js
│       └── views/             # One module per page (dashboard, syllabus, …)
├── data/                      # 📚 ALL study content — versioned & editable
│   ├── streams.json           #   stream → subject structure
│   ├── syllabus.json          #   chapter-wise syllabus (the tracker)
│   ├── formulas.json          #   the formula sheet
│   ├── textbooks.json         #   official textbook links
│   ├── papers.json            #   official past-paper links
│   ├── grading.json           #   HSC marking scheme / class boundaries
│   ├── board-links.json       #   auto-updated by the watcher workflow
│   ├── version.json           #   app version
│   └── search-index.json      #   generated by CI (don't edit by hand)
├── scripts/                   # Python helpers used by the workflows
│   ├── validate_data.py
│   ├── build_search_index.py
│   └── check_board_updates.py
└── .github/
    ├── workflows/             # The 4 Actions workflows above
    └── ISSUE_TEMPLATE/        # Bug / feature / content-correction forms
```

---

## ✏️ Editing the study content (no coding needed)

All content is plain JSON in **`/data`**. To fix a chapter name or add a formula:

1. Open the file on GitHub (e.g. `data/syllabus.json`) → click the ✏️ pencil.
2. Make your edit → **Commit changes**.
3. The **CI** workflow validates it. If valid, the site updates in ~1 minute.
   If you made a typo, the workflow goes red and tells you what's wrong — the live
   site is never broken.

Prefer not to edit JSON? Open a **📚 Content correction** issue (Issues tab → New
issue) and describe the fix.

---

## 💾 How your data is stored

- **Static study content** (syllabus, formulas, links) → versioned JSON in this
  repo. Transparent, reviewable, and the thing the automation updates.
- **Your personal data** (progress, flashcards, tasks, timer logs):
  - **Cloud mode** (Firebase configured + signed in) → Firestore, synced across
    devices, private to you via the security rules.
  - **Local mode** (no Firebase yet) → your browser's `localStorage`, on this
    device only. You can switch on cloud sync anytime — see Part 2.
- **Export anytime:** Settings → "⬇ Export (JSON)" downloads a backup of your data.

---

## 🧰 Tech & design notes

- **No build step, no framework, no `node_modules`.** Plain ES-module JavaScript,
  loaded directly by the browser. Firebase is pulled from its CDN only when needed.
- The Python scripts use the **standard library only** — nothing to `pip install`.
  GitHub's runners already have Python, Node and `gh`, so you don't need anything
  locally.
- Fully responsive, accessible-ish, dark/light, and installable (PWA).

### Run it locally (optional)
You don't need to, but if you want to preview before pushing, any static server works, e.g.:
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## 🤝 Contributing

Issues and PRs welcome! Use the issue forms in the **Issues** tab. For content
fixes, please cite an **official** Balbharati / MSBSHSE source. See the PR
checklist for the basics (validate data, test in both themes, official links only).

---

## ⚖️ License & disclaimer

Licensed under the **MIT License** — see [`LICENSE`](LICENSE).

This is an **unofficial, student-built study aid**. It is not affiliated with or
endorsed by MSBSHSE or Balbharati. It **does not host any copyrighted textbook
PDFs** — it only links to the official, free government portals. All trademarks
and copyrighted materials belong to their respective owners. Always verify
exam-critical details (syllabus, marking scheme, dates) against the official
board website.

Made with 💜 for Maharashtra HSC students.
