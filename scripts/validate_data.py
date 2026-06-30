#!/usr/bin/env python3
"""
Validate every JSON content file in /data.

Run locally with:   python3 scripts/validate_data.py
The CI workflow runs this on every push / PR and fails the build on any error,
so broken content can never reach GitHub Pages.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load(name):
    path = DATA / name
    if not path.exists():
        err(f"{name}: file is missing")
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(f"{name}: invalid JSON — {e}")
        return None


def is_url(v):
    return isinstance(v, str) and (v.startswith("http://") or v.startswith("https://"))


def check_streams(streams):
    if not streams or "streams" not in streams:
        err("streams.json: missing top-level 'streams' array")
        return {}
    subject_ids = {}
    for st in streams["streams"]:
        for key in ("id", "name", "subjects"):
            if key not in st:
                err(f"streams.json: stream missing '{key}'")
        for sub in st.get("subjects", []):
            if "id" not in sub or "name" not in sub:
                err(f"streams.json: subject in '{st.get('id')}' missing id/name")
            else:
                subject_ids[sub["id"]] = sub["name"]
    return subject_ids


def check_syllabus(syl, subject_ids):
    subs = (syl or {}).get("subjects", {})
    if not subs:
        err("syllabus.json: missing 'subjects'")
        return
    for sid, meta in subs.items():
        chapters = meta.get("chapters")
        if not isinstance(chapters, list) or not chapters:
            err(f"syllabus.json: '{sid}' has no chapters")
            continue
        for i, ch in enumerate(chapters):
            if not isinstance(ch, str) or not ch.strip():
                err(f"syllabus.json: '{sid}' chapter #{i+1} is empty")
    # any stream subject that has no syllabus is only a warning (reference subjects)
    for sid in subject_ids:
        if sid not in subs:
            warn(f"syllabus.json: no chapters for subject '{sid}' (treated as reference-only)")


def check_formulas(fm):
    subs = (fm or {}).get("subjects", {})
    if not subs:
        err("formulas.json: missing 'subjects'")
        return
    for sid, meta in subs.items():
        topics = meta.get("topics")
        if not isinstance(topics, list) or not topics:
            err(f"formulas.json: '{sid}' has no topics")
            continue
        for t in topics:
            if not t.get("topic"):
                err(f"formulas.json: '{sid}' has a topic with no name")
            for f in t.get("formulas", []):
                if not f.get("name") or not f.get("expr"):
                    err(f"formulas.json: '{sid}/{t.get('topic')}' has a formula missing name/expr")


def check_links(name, obj):
    """Recursively ensure every 'url' / 'portal' value is a real http(s) link."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("url", "portal") and v is not None and not is_url(v):
                err(f"{name}: '{k}' is not a valid URL → {v!r}")
            else:
                check_links(name, v)
    elif isinstance(obj, list):
        for item in obj:
            check_links(name, item)


def main():
    streams = load("streams.json")
    syllabus = load("syllabus.json")
    formulas = load("formulas.json")
    textbooks = load("textbooks.json")
    papers = load("papers.json")
    grading = load("grading.json")
    board = load("board-links.json")
    version = load("version.json")

    subject_ids = check_streams(streams)
    check_syllabus(syllabus, subject_ids)
    check_formulas(formulas)

    for nm, obj in (("textbooks.json", textbooks), ("papers.json", papers), ("board-links.json", board)):
        if obj is not None:
            check_links(nm, obj)

    if grading is not None:
        if "passingMarkPercent" not in grading:
            err("grading.json: missing 'passingMarkPercent'")
        if not grading.get("divisions"):
            err("grading.json: missing 'divisions'")

    if version is not None and not version.get("version"):
        err("version.json: missing 'version'")

    # ---- report ----
    for w in warnings:
        print(f"::warning::{w}")
    if errors:
        for e in errors:
            print(f"::error::{e}")
        print(f"\n❌ Validation failed with {len(errors)} error(s).")
        sys.exit(1)
    print(f"✅ All data files valid ({len(warnings)} warning(s)).")


if __name__ == "__main__":
    main()
