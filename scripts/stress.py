#!/usr/bin/env python3
"""Stress marks for Lithuanian course words, from English Wiktionary headwords (CC BY-SA 4.0).

For every Lithuanian item without `stress`, fetch the word's Wiktionary page (cached in .cache/wiktionary/),
take the stressed headword (head=…) of the Lithuanian entry with the same part of speech, and keep it only if
- exactly one distinct stressed form exists for that part of speech (homographs such as láikas/laĩkas are skipped), and
- removing the accent marks gives back the course word exactly.
Results are merged into content/lt/stress.yaml (existing entries are kept); skipped words are listed for manual work.

Usage: pnpm build:content && python3 scripts/stress.py [--limit N]
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "wiktionary"
OUT = ROOT / "content" / "lt" / "stress.yaml"
API = "https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page="
UA = "EverydayLearning/1.0 (personal language-learning app; stress marks for vocabulary cards)"

# Lithuanian accent marks: grave, acute, tilde. Ogonek, caron, dot above and macron are letters, not accents.
ACCENTS = {"̀", "́", "̃"}
TEMPLATE_POS = {"noun": "noun", "verb": "verb", "adj": "adj", "adv": "adv", "pron": "pron", "num": "num"}


def strip_accents(s: str) -> str:
    return unicodedata.normalize("NFC", "".join(c for c in unicodedata.normalize("NFD", s) if c not in ACCENTS))


BATCH_API = "https://en.wiktionary.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles="


def prefetch(words: list[str]) -> None:
    """Fill the cache 50 pages per request (missing or empty cache entries only) — far gentler than one call per word."""
    CACHE.mkdir(parents=True, exist_ok=True)
    todo = [w for w in words if not (CACHE / f"{w}.json").exists() or not json.loads((CACHE / f"{w}.json").read_text()).get("wikitext")]
    for i in range(0, len(todo), 50):
        chunk = todo[i : i + 50]
        req = urllib.request.Request(BATCH_API + urllib.parse.quote("|".join(chunk)), headers={"User-Agent": UA})
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    data = json.load(r)
                break
            except Exception:
                time.sleep(10 * (attempt + 1))
        else:
            print(f"  ✗ batch {i // 50 + 1} failed, will retry next run", flush=True)
            continue
        # Titles come back normalized (NFC); map them back to the course words.
        norm = {unicodedata.normalize("NFC", n["from"]): n["to"] for n in data.get("query", {}).get("normalized", [])}
        pages = {p["title"]: p for p in data.get("query", {}).get("pages", [])}
        for w in chunk:
            p = pages.get(norm.get(w, w)) or pages.get(unicodedata.normalize("NFC", w))
            if not p:
                continue
            text = "" if p.get("missing") else p.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
            (CACHE / f"{w}.json").write_text(json.dumps({"wikitext": text}, ensure_ascii=False))
        print(f"  … fetched {min(i + 50, len(todo))}/{len(todo)}", flush=True)
        time.sleep(2)


def fetch(word: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{word}.json"
    if path.exists():
        return json.loads(path.read_text()).get("wikitext", "")
    req = urllib.request.Request(API + urllib.parse.quote(word), headers={"User-Agent": UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.load(r)
            break
        except Exception:  # network hiccup or rate limit (429): back off, don't cache
            time.sleep(5 * (attempt + 1))
    else:
        return ""
    if "error" in data and data["error"].get("code") != "missingtitle":
        return ""  # transient API error: try again next run
    text = data.get("parse", {}).get("wikitext", "")
    path.write_text(json.dumps({"wikitext": text}, ensure_ascii=False))
    time.sleep(1.0)  # be polite to the API (about 1 request per second)
    return text


def heads(wikitext: str, pos: str) -> set[str]:
    """Stressed headwords of the Lithuanian section for one part of speech."""
    i = wikitext.find("==Lithuanian==")
    if i < 0:
        return set()
    section = wikitext[i:]
    j = re.search(r"\n==[^=]", section[2:])
    if j:
        section = section[: j.start() + 2]
    found, has_pos = set(), False
    for kind, args in re.findall(r"\{\{lt-(noun|verb|adj|adv|pron|num)\|([^}]*)\}\}", section):
        if TEMPLATE_POS[kind] != pos:
            continue
        has_pos = True
        m = re.search(r"head=([^|}]+)", args)
        if m:
            found.add(clean(m.group(1)))
    if not found and has_pos:
        # Fallback: the pronunciation template {{lt-pr|ti̇̀kslas}}, only if the page has exactly one.
        prs = {clean(p.split("|")[0]) for p in re.findall(r"\{\{lt-pr\|([^}]*)\}\}", section)}
        if len(prs) == 1:
            found = prs
    return found


def clean(s: str) -> str:
    """NFC, and drop the dot some sources write over an accented i (i̇̀ → ì)."""
    d = unicodedata.normalize("NFD", s.strip())
    d = re.sub(r"([iI])̇(?=[̀́̃])", r"\1", d)
    return unicodedata.normalize("NFC", d)


def load_existing() -> dict[str, str]:
    if not OUT.exists():
        return {}
    out = {}
    for line in OUT.read_text().splitlines():
        m = re.match(r'^"?([^":#]+)"?:\s*"?([^"#]+)"?\s*$', line)
        if m:
            out[m.group(1).strip()] = m.group(2).strip()
    return out


def main() -> int:
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    items = json.loads((ROOT / "apps/worker/src/generated/content.json").read_text())
    existing = load_existing()
    todo = [i for i in items if i["id"].startswith("lt-w-") and not i.get("stress") and i["text"] not in existing and i.get("pos")]
    if limit:
        todo = todo[:limit]
    prefetch([i["text"] for i in todo])
    added, skipped = {}, []
    for n, item in enumerate(todo, 1):
        word, pos = item["text"], item["pos"]
        found = {h for h in heads(fetch(word), pos) if strip_accents(h) == word and h != word}
        if len(found) == 1:
            added[word] = found.pop()
        else:
            skipped.append(f"{word} ({pos}): {'not found' if not found else 'ambiguous ' + ', '.join(sorted(found))}")
        if n % 50 == 0:
            print(f"  … {n}/{len(todo)}", flush=True)
    merged = {**existing, **added}
    header = [
        "# Stress marks for Lithuanian course words (merged into the items by scripts/build-content.ts).",
        "# Source: English Wiktionary headwords (https://en.wiktionary.org), CC BY-SA 4.0, collected by scripts/stress.py;",
        "# only unambiguous entries whose part of speech matches the course word. Fix or add entries by hand as needed.",
    ]
    body = [f'{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in sorted(merged.items())]
    OUT.write_text("\n".join(header + body) + "\n")
    (ROOT / ".cache" / "stress-skipped.txt").write_text("\n".join(skipped) + "\n")
    print(f"✓ {len(added)} new, {len(merged)} total in {OUT.relative_to(ROOT)}; {len(skipped)} skipped → .cache/stress-skipped.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
