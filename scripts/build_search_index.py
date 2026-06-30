#!/usr/bin/env python3
"""
Build data/search-index.json — a single flat list the app's global search box
loads once. Regenerated automatically by CI whenever content changes, so the
search index is always in sync with the source JSON files.

Run locally with:   python3 scripts/build_search_index.py
"""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def subject_names():
    streams = load("streams.json")
    names = {}
    for st in streams["streams"]:
        for sub in st["subjects"]:
            names[sub["id"]] = sub["name"]
    return names


def main():
    names = subject_names()
    items = []

    # formulas
    formulas = load("formulas.json")["subjects"]
    for sid, meta in formulas.items():
        for topic in meta["topics"]:
            for f in topic["formulas"]:
                items.append({
                    "type": "formula",
                    "subject": sid,
                    "subjectName": names.get(sid, meta.get("name", sid)),
                    "title": f["name"],
                    "sub": f["expr"],
                    "hash": f"#/formulas/{sid}",
                })

    # syllabus chapters
    syllabus = load("syllabus.json")["subjects"]
    for sid, meta in syllabus.items():
        for ch in meta["chapters"]:
            items.append({
                "type": "chapter",
                "subject": sid,
                "subjectName": names.get(sid, meta.get("name", sid)),
                "title": ch,
                "sub": f"{meta.get('name', sid)} · chapter",
                "hash": f"#/syllabus/{sid}",
            })

    # textbooks
    textbooks = load("textbooks.json")["subjects"]
    for sid, meta in textbooks.items():
        items.append({
            "type": "textbook",
            "subject": sid,
            "subjectName": names.get(sid, meta.get("name", sid)),
            "title": meta.get("textbook", meta["name"]),
            "sub": "Official textbook",
            "hash": "#/textbooks",
        })

    index = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(items),
        "items": items,
    }
    out = DATA / "search-index.json"
    out.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✅ Wrote {out.relative_to(ROOT)} with {len(items)} entries.")


if __name__ == "__main__":
    main()
