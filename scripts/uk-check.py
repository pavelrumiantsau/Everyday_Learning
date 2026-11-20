#!/usr/bin/env python3
"""Checks the Ukrainian sentences of content/uk/blocks with LanguageTool (docs/UK-GRAMMAR-PLAN.md §7).

Every sentence that should be right (examples, answers, corrected forms) must get no LanguageTool match; a sentence
that should be wrong (a fix/spot/judge task, a «typical mistake») should get one — if it doesn't, a person checks it.
The content is course material, not the learner's own texts, so the public API is fine (or set LT_URL to a local
server, e.g. http://localhost:8081/v2/check). Answers are cached in .cache/uk-check/ by sentence.

Usage: python3 scripts/uk-check.py [block files…]     (default: all blocks)
Exit code 1 when a "right" sentence gets a match.
"""
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "uk-check"
LT_URL = os.environ.get("LT_URL", "https://api.languagetool.org/v2/check")
PUBLIC = "api.languagetool.org" in LT_URL
BLANK = "___"
# Rules that only complain about style of isolated sentences, not about Ukrainian norms.
IGNORED = {
    "UPPERCASE_SENTENCE_START",
    "WHITESPACE_RULE",
    "PUNCTUATION_PARAGRAPH_END",
    # «дві третіх» is the current Правопис form; this rule only argues it should be «треті».
    "consistency_numeric_fractional",
}


def is_meta(text):
    """A transcription ([хл’іб]) — not Ukrainian text to check."""
    return text.strip().startswith("[")


def sentences(block):
    """(sentence, should_be_right, where) for every Ukrainian sentence of a block. Questions about the language itself
    («Як читається «щастя»?», a choice without a blank) and transcriptions are skipped: they aren't sentences to check."""
    out = [(e["text"], True, "example") for e in block.get("examples", [])]
    for p in block.get("pairs", []):
        if not is_meta(p["right"]):
            out += [(p["right"], True, "pair right"), (p["wrong"], False, "pair wrong")]
    for i, ex in enumerate(block.get("exercises", [])):
        where = f"x{i + 1} {ex['type']}"
        t = ex["type"]
        if t == "cloze":
            out += [(ex["text"].replace(BLANK, a), True, where) for a in [ex["answer"], *ex.get("also", [])]]
        elif t == "choice" and BLANK in ex["text"]:
            out.append((ex["text"].replace(BLANK, ex["options"][ex["answer"]]), True, where))
        elif t == "fix":
            out += [(a, True, where) for a in [ex["answer"], *ex.get("also", [])]]
            out.append((ex["text"], False, where))
        elif t == "spot":
            words = ex["text"].split()
            fixed = " ".join(w.replace(ex["wrong"], ex["answer"]) if w.strip(".,!?;:«»\"") == ex["wrong"] else w for w in words)
            out += [(fixed, True, where), (ex["text"], False, where)]
        elif t == "judge":
            out.append((ex["text"], ex["correct"], where))
            if not ex["correct"]:
                out.append((ex["fix"], True, where))
    # Fragments (a phrase, not a sentence) are checked too; capitalisation rules are ignored above.
    return out


SEP = "\n\n"


def check_many(texts):
    """LanguageTool matches for each text; one request for all of them (paragraphs are checked separately)."""
    joined = SEP.join(texts)
    matches = check(joined)
    starts, pos = [], 0
    for t in texts:
        starts.append(pos)
        pos += len(t) + len(SEP)
    out = [[] for _ in texts]
    for m in (m for m in matches if m["rule"] not in IGNORED):  # also for results cached before a rule was ignored
        i = max(j for j, s in enumerate(starts) if s <= m["offset"])
        out[i].append(m)
    return out


def check(text):
    key = hashlib.sha256(text.encode()).hexdigest()[:24]
    cached = CACHE / f"{key}.json"
    if cached.exists():
        return json.loads(cached.read_text(encoding="utf-8"))
    data = urllib.parse.urlencode({"text": text, "language": "uk-UA"}).encode()
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(LT_URL, data=data), timeout=30) as r:
                matches = json.loads(r.read())["matches"]
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 4:
                raise
            time.sleep(20)
    if PUBLIC:
        time.sleep(3.2)  # public API: 20 requests per minute
    result = [
        {"rule": m["rule"]["id"], "message": m["message"], "offset": m["offset"], "found": text[m["offset"] : m["offset"] + m["length"]],
         "suggest": [r["value"] for r in m.get("replacements", [])[:3]]}
        for m in matches
        if m["rule"]["id"] not in IGNORED
    ]
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    return result


def main(paths):
    sys.stdout.reconfigure(encoding="utf-8")  # Cyrillic output on Windows consoles too
    files = [Path(p) for p in paths] or sorted((ROOT / "content" / "uk" / "blocks").glob("*/*.yaml"))
    bad = unflagged = total = 0
    for f in files:
        block = yaml.safe_load(f.read_text(encoding="utf-8"))
        found = sentences(block)
        for (text, right, where), matches in zip(found, check_many([t for t, _, _ in found])):
            total += 1
            if right and matches:
                bad += 1
                for m in matches:
                    print(f"✗ {block['id']} {where}: «{text}» — {m['found']!r}: {m['message']} [{m['rule']}] → {', '.join(m['suggest']) or '—'}")
            elif not right and not matches:
                unflagged += 1
                print(f"? {block['id']} {where}: «{text}» — wrong on purpose, LanguageTool sees nothing (check by eye)")
    print(f"{total} sentences in {len(files)} blocks: {bad} right ones flagged, {unflagged} wrong ones not flagged")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
