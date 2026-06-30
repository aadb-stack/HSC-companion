#!/usr/bin/env python3
"""
Check the official Maharashtra board / Balbharati pages for changes.

How it works
------------
1. Reads data/board-links.json (the list of official source URLs).
2. Fetches each page (stdlib urllib — nothing to install).
3. Strips scripts/styles/HTML tags, collapses whitespace, and hashes the text.
4. Compares the hash with the 'lastSeenHash' stored for that source:
     • first time      → captures the hash (baseline)
     • hash differs     → records a 'notice' so the app can flag "updated!"
     • hash unchanged   → does nothing
5. Only when something actually changed does it rewrite board-links.json, so
   the cron job stays quiet (and commit-free) on days with no updates.

The GitHub Actions workflow then commits the file IF git sees a diff.
Network failures are swallowed — a temporarily unreachable site never breaks
the job; the source is just marked 'unreachable' for that run in memory.
"""
import hashlib
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "data" / "board-links.json"

TAGS = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.I | re.S)
HTML = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")
UA = "Mozilla/5.0 (compatible; HSC-StudyHub-LinkChecker/1.0; +https://github.com)"


def fetch_hash(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="ignore")
    text = TAGS.sub(" ", raw)
    text = HTML.sub(" ", text)
    text = WS.sub(" ", text).strip().lower()
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    data = json.loads(FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    changed = False
    notices = data.get("notices", [])

    for src in data["sources"]:
        url = src.get("url")
        try:
            digest = fetch_hash(url)
        except Exception as e:  # noqa: BLE001 — never fail the job on a flaky site
            print(f"⚠ {src['id']}: unreachable ({e.__class__.__name__})")
            continue

        prev = src.get("lastSeenHash")
        if prev is None:
            src["lastSeenHash"] = digest
            src["status"] = "active"
            changed = True
            print(f"• {src['id']}: baseline captured")
        elif prev != digest:
            src["lastSeenHash"] = digest
            src["status"] = "active"
            notice = {
                "sourceId": src["id"],
                "name": src["name"],
                "url": url,
                "detectedAt": now,
                "message": f"Content changed on {src['name']} — check for new notices/papers.",
            }
            notices.insert(0, notice)
            changed = True
            print(f"🔔 {src['id']}: change detected")
        else:
            print(f"✓ {src['id']}: no change")

    if changed:
        data["notices"] = notices[:20]  # keep the 20 most recent
        data["meta"]["lastChecked"] = now
        data["meta"]["lastCheckedBy"] = "github-actions"
        data["meta"]["autoUpdated"] = True
        FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("\n✅ board-links.json updated.")
    else:
        print("\nℹ No material changes — file left untouched.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
