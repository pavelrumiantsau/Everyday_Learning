#!/usr/bin/env python3
"""Stress marks for Lithuanian course words, from English Wiktionary (CC BY-SA 4.0).

Source 1 — the word's own entry. For every Lithuanian item without `stress`, fetch the word's Wiktionary page
(cached in .cache/wiktionary/), take the stressed headword (head=…) of the Lithuanian entry with the same part of
speech, and keep it only if
- exactly one distinct stressed form exists for that part of speech (homographs such as láikas/laĩkas are skipped), and
- removing the accent marks gives back the course word exactly.

Source 2 — mentions on other entries (only for words source 1 did not find at all). Many Lithuanian words have no
entry of their own but are linked, with their stress marks, from other pages: translation tables of English entries
({{t+|lt|tyrimas|alt=tyrìmas}}), derived/related terms and synonyms of Lithuanian entries ({{l|lt|tyrìmas}}).
The pages linking to the word come from the batched `linkshere` API (cached in .cache/wiktionary-links/), their
wikitext is fetched 50 pages per request (cached in .cache/wiktionary-pages/). A mention is accepted only if
- every Lithuanian mention of the word on all linking pages has the same stressed form (otherwise: ambiguous),
- that form carries exactly one stress mark and gives back the course word when the marks are removed.
Unverified translations ({{t-check}}) are ignored. Mentions carry no part of speech, so these entries are tagged
in stress.yaml with a `# mentions: <pages>` comment for review. Words source 1 found ambiguous are never filled here.

Considered and not used (Oct 2026): Lithuanian Wiktionary (few entries, headwords mostly unaccented — 1 of 50 sampled
skipped words), ru/de/pl/fr Wiktionary (0–1 of 50), ekalba.lt / lkz.lt (no documented public API), the VDU
kirčiuoklis (automatic, not a dictionary).

Results are merged into content/lt/stress.yaml (existing entries are kept); skipped words are listed for manual work.

Usage: pnpm build:content && python3 scripts/stress.py [--limit N] [--no-mentions]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
import unicodedata
import urllib.error
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


def api_get(url: str) -> dict | None:
    """GET a MediaWiki API URL with retries; honours Retry-After on 429. None when it keeps failing."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get("Retry-After") or 0) if e.code == 429 else 0
            time.sleep(max(wait + 2, 10 * (attempt + 1)))
        except Exception:
            time.sleep(10 * (attempt + 1))
    return None


RECHECK_MISSING = 14 * 86400  # a missing page is asked for again after two weeks, not on every run


def prefetch(words: list[str]) -> None:
    """Fill the cache 50 pages per request (missing or empty cache entries only) — far gentler than one call per word."""
    CACHE.mkdir(parents=True, exist_ok=True)

    def stale(w: str) -> bool:
        path = CACHE / f"{w}.json"
        if not path.exists():
            return True
        data = json.loads(path.read_text())
        return not data.get("wikitext") and time.time() - data.get("checked", 0) > RECHECK_MISSING

    todo = [w for w in words if stale(w)]
    for i in range(0, len(todo), 50):
        chunk = todo[i : i + 50]
        data = api_get(BATCH_API + urllib.parse.quote("|".join(chunk)))
        if data is None:
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
            (CACHE / f"{w}.json").write_text(json.dumps({"wikitext": text, "checked": int(time.time())}, ensure_ascii=False))
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


# ---------------------------------------------------------------- source 2: mentions on other pages

LINKS_CACHE = ROOT / ".cache" / "wiktionary-links"
PAGES_CACHE = ROOT / ".cache" / "wiktionary-pages"
LINKSHERE_API = "https://en.wiktionary.org/w/api.php?action=query&prop=linkshere&lhnamespace=0&lhprop=title&lhlimit=max&format=json&formatversion=2"

# Templates whose first argument is the language of the terms that follow (all following positional args are terms).
LANG_FIRST_ALL = {
    "syn", "ant", "hyp", "hyper", "cot", "co", "alt", "alter", "desc", "desctree", "cog", "noncog", "ncog",
    "col", "col2", "col3", "col4", "col5", "col-u", "col-auto", "der2", "der3", "der4", "rel2", "rel3", "rel4",
}
# Links and mentions "{{l|lt|term|alt}}": the 2nd positional arg and the 3rd (display form) are terms.
LANG_FIRST_LINK = {"l", "m", "l-lite", "m-lite", "ll", "link", "mention"}
# Translations "{{t|lt|term|m|alt=…}}": only the term and alt= (later positional args are genders). t-check is left out.
TRANSLATION = {"t", "t+", "tt", "tt+", "t-simple"}
# Etymology "{{der|xx|lt|term|alt}}": terms only when the source language (2nd arg) is Lithuanian.
SOURCE_SECOND = {"der", "der+", "inh", "inh+", "bor", "bor+", "lbor", "slbor", "calque", "cal", "psm", "uder", "obor"}

TEMPLATE = re.compile(r"\{\{([^{}|]+)\|([^{}]*)\}\}")


HEADER_POS = {"noun": "noun", "verb": "verb", "adjective": "adj", "adverb": "adv"}
HEADER = re.compile(r"^(=+)\s*([^=]+?)\s*=+\s*$", re.M)


def lt_terms(wikitext: str) -> list[tuple[str, str | None]]:
    """Lithuanian terms mentioned in a page's templates, as written (possibly with stress marks), with their part of
    speech when the page tells it: translations take it from the section header above the table (===Verb===),
    Lithuanian headword templates from their name (lt-noun). Links in lists of related words carry none."""
    text = unicodedata.normalize("NFC", wikitext)
    headers = [(h.start(), len(h.group(1)), h.group(2).strip()) for h in HEADER.finditer(text)]
    out = []
    for m in TEMPLATE.finditer(text):
        name = m.group(1).strip()
        lang, section, section_pos = "", "", None
        for start, level, title in headers:
            if start > m.start():
                break
            if level == 2:
                lang, section, section_pos = title, "", None
            else:
                section = title
                if title.startswith("Etymology") or level == 3 and title not in ("Translations", "Pronunciation"):
                    section_pos = None  # a new etymology or part of speech; POS headers below set it again
                section_pos = HEADER_POS.get(title.lower(), section_pos)
        # Only the English section (translation tables) and the Lithuanian section (related words, synonyms). Etymologies
        # and cognate lists elsewhere cite Lithuanian words with dictionary or reconstructed accents that are not
        # always today's standard ones (síekti for siẽkti), so they are left out.
        if lang not in ("English", "Lithuanian") or section.startswith(("Etymology", "Descendants")):
            continue
        term_pos = None
        args = m.group(2).split("|")
        pos = [a.strip() for a in args if "=" not in a]
        named = dict(a.split("=", 1) for a in args if "=" in a)
        terms: list[str] = []
        if name in LANG_FIRST_ALL and pos[:1] == ["lt"]:
            terms = pos[1:]
        elif name in LANG_FIRST_LINK and pos[:1] == ["lt"]:
            terms = pos[1:3] + [named.get("alt", "")]
        elif name in TRANSLATION and pos[:1] == ["lt"]:
            terms = pos[1:2] + [named.get("alt", "")]
            term_pos = section_pos
        elif name in SOURCE_SECOND and pos[1:2] == ["lt"]:
            terms = pos[2:4]
        elif name.startswith("lt-"):
            terms = [named.get("head", "")]
            term_pos = TEMPLATE_POS.get(name[3:])
        for t in terms:
            t = re.sub(r"<[^>]*>|\[\[|\]\]", "", t).strip()  # inline modifiers <q:…>, wiki links
            if t:
                out.append((clean(t), term_pos))
    return out


def linking_pages(words: list[str]) -> dict[str, list[str]]:
    """word → titles of main-namespace pages linking to it (red links included), 50 words per request, cached."""
    LINKS_CACHE.mkdir(parents=True, exist_ok=True)
    todo = [w for w in words if not (LINKS_CACHE / f"{w}.json").exists()]
    for i in range(0, len(todo), 50):
        chunk = todo[i : i + 50]
        found: dict[str, set[str]] = {w: set() for w in chunk}
        cont: dict[str, str] = {}
        ok = True
        while True:
            url = LINKSHERE_API + "&titles=" + urllib.parse.quote("|".join(chunk))
            url += "".join(f"&{k}={urllib.parse.quote(str(v))}" for k, v in cont.items())
            data = api_get(url)
            if data is None:
                ok = False
                break
            norm = {n["to"]: unicodedata.normalize("NFC", n["from"]) for n in data.get("query", {}).get("normalized", [])}
            for p in data.get("query", {}).get("pages", []):
                w = norm.get(p["title"], unicodedata.normalize("NFC", p["title"]))
                if w in found:
                    found[w].update(link["title"] for link in p.get("linkshere", []))
            time.sleep(1)
            if "continue" not in data:
                break
            cont = data["continue"]
        if not ok:
            print(f"  ✗ links batch {i // 50 + 1} failed, will retry next run", flush=True)
            continue
        for w, titles in found.items():
            (LINKS_CACHE / f"{w}.json").write_text(json.dumps(sorted(titles), ensure_ascii=False))
        print(f"  … links {min(i + 50, len(todo))}/{len(todo)}", flush=True)
    return {w: json.loads((LINKS_CACHE / f"{w}.json").read_text()) for w in words if (LINKS_CACHE / f"{w}.json").exists()}


def page_path(title: str) -> Path:
    # Hashed names: titles may differ only in case ("Taika"/"taika"), and the macOS file system ignores case.
    return PAGES_CACHE / (hashlib.sha1(title.encode()).hexdigest()[:20] + ".json")


def page_texts(titles: set[str]) -> dict[str, str]:
    """title → wikitext, 50 pages per request, cached."""
    PAGES_CACHE.mkdir(parents=True, exist_ok=True)
    todo = sorted(t for t in titles if not page_path(t).exists())
    for i in range(0, len(todo), 50):
        chunk = todo[i : i + 50]
        data = api_get(BATCH_API + urllib.parse.quote("|".join(chunk)))
        if data is None:
            print(f"  ✗ pages batch {i // 50 + 1} failed, will retry next run", flush=True)
            continue
        for p in data.get("query", {}).get("pages", []):
            text = "" if p.get("missing") else p.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
            page_path(p["title"]).write_text(json.dumps({"title": p["title"], "wikitext": text}, ensure_ascii=False))
        print(f"  … pages {min(i + 50, len(todo))}/{len(todo)}", flush=True)
        time.sleep(2)
    return {t: json.loads(page_path(t).read_text())["wikitext"] for t in titles if page_path(t).exists()}


def accent_count(s: str) -> int:
    return sum(1 for c in unicodedata.normalize("NFD", s) if c in ACCENTS)


MAIN_POS = {"noun", "verb", "adj"}

# Mentions checked by hand and found doubtful: never taken from source 2 (add the right form to stress.yaml by hand).
REJECT = {
    "vaišinti": "the only mention (synonym on 'mylėti') is váišinti; the standard form is vaišìnti",
}


def from_mentions(words: dict[str, str]) -> tuple[dict[str, tuple[str, list[str]]], dict[str, str]]:
    """{word: pos} → word → (stressed form, pages mentioning it); and word → why it was skipped.

    Part of speech: a mention whose POS is known (translations, headwords) and is another of noun/verb/adjective
    is a homograph and is left out. Words in -tis can be a reflexive verb or a noun (skìrtis «различаться» vs
    skirtìs «различие»), so they need at least one mention with the matching POS."""
    links = linking_pages(list(words))
    texts = page_texts({t for ts in links.values() for t in ts})
    accepted, why = {}, {}
    for w, wpos in words.items():
        forms: dict[str, set[str]] = {}
        confirmed = other_pos = False
        for title in links.get(w, []):
            for t, tpos in lt_terms(texts.get(title, "")):
                if strip_accents(t) != w or t == w:
                    continue
                if tpos in MAIN_POS and wpos in MAIN_POS and tpos != wpos:
                    other_pos = True
                    continue
                confirmed = confirmed or tpos == wpos
                forms.setdefault(t, set()).add(title)
        if w.endswith("tis"):
            # A verb is never stressed on the ending -tis; a noun stressed there (skirtìs, praeitìs) is surely a noun.
            final = {t for t in forms if unicodedata.normalize("NFD", t)[-3:-1] in ("ì", "í", "ĩ")}
            if wpos == "verb":
                other_pos = other_pos or bool(final)
                forms = {t: p for t, p in forms.items() if t not in final}
            elif wpos == "noun" and final and set(forms) == final:
                confirmed = True
        if w in REJECT:
            why[w] = "rejected by hand: " + REJECT[w]
        elif not forms:
            why[w] = "mentions only for another part of speech" if other_pos else "not found"
        elif w.endswith("tis") and not confirmed:
            why[w] = "-tis word (verb or noun?) without a mention of the same part of speech: " + ", ".join(sorted(forms))
        elif len(forms) > 1:
            why[w] = "mentions disagree " + ", ".join(sorted(forms))
        elif accent_count(next(iter(forms))) != 1:
            why[w] = f"mention {next(iter(forms))} has {accent_count(next(iter(forms)))} stress marks"
        else:
            form, pages = next(iter(forms.items()))
            accepted[w] = (form, sorted(pages))
    return accepted, why


# ---------------------------------------------------------------- stress.yaml

def load_existing() -> dict[str, tuple[str, str]]:
    """word → (stressed form, trailing comment without '#', or '')."""
    if not OUT.exists():
        return {}
    out = {}
    for line in OUT.read_text().splitlines():
        m = re.match(r'^"([^"]+)":\s*"([^"]+)"\s*(?:#\s*(.*))?$', line)
        if m:
            out[m.group(1).strip()] = (m.group(2).strip(), (m.group(3) or "").strip())
    return out


def main() -> int:
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 0
    items = json.loads((ROOT / "apps/worker/src/generated/content.json").read_text())
    existing = load_existing()
    todo = [i for i in items if i["id"].startswith("lt-w-") and not i.get("stress") and i["text"] not in existing and i.get("pos")]
    if limit:
        todo = todo[:limit]
    prefetch([i["text"] for i in todo])
    added: dict[str, tuple[str, str]] = {}
    skipped: dict[str, str] = {}
    pos_of = {i["text"]: i["pos"] for i in todo}
    for n, item in enumerate(todo, 1):
        word, pos = item["text"], item["pos"]
        found = {h for h in heads(fetch(word), pos) if strip_accents(h) == word and h != word}
        if len(found) == 1:
            added[word] = (found.pop(), "")
        else:
            skipped[word] = "not found" if not found else "ambiguous " + ", ".join(sorted(found))
        if n % 50 == 0:
            print(f"  … {n}/{len(todo)}", flush=True)
    n1 = len(added)
    if "--no-mentions" not in sys.argv:
        # Source 2 only for single words source 1 didn't find at all — never for its ambiguous homographs.
        rest = {w: pos_of[w] for w, why in skipped.items() if why == "not found" and " " not in w}
        accepted, why = from_mentions(rest)
        for w, (form, pages) in accepted.items():
            shown = ", ".join(pages[:3]) + (f" +{len(pages) - 3}" if len(pages) > 3 else "")
            added[w] = (form, f"mentions: {shown}")
            del skipped[w]
        for w, reason in why.items():
            skipped[w] = "no entry, no mention" if reason == "not found" else "no entry; " + reason
    merged = {**existing, **added}
    header = [
        "# Stress marks for Lithuanian course words (merged into the items by scripts/build-content.ts).",
        "# Source: English Wiktionary (https://en.wiktionary.org), CC BY-SA 4.0, collected by scripts/stress.py.",
        "# Plain entries: the word's own entry (headword with the same part of speech, unambiguous).",
        "# `# mentions: …` entries: the word has no entry of its own; every stressed mention of it on the pages named",
        "# (translation tables, derived terms, synonyms) agrees. Fix or add entries by hand as needed.",
    ]
    body = [
        f"{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" + (f"  # {c}" if c else "")
        for k, (v, c) in sorted(merged.items())
    ]
    OUT.write_text("\n".join(header + body) + "\n")
    (ROOT / ".cache" / "stress-skipped.txt").write_text("".join(f"{w} ({pos_of[w]}): {r}\n" for w, r in skipped.items()))
    print(
        f"✓ {len(added)} new ({n1} from entries, {len(added) - n1} from mentions), {len(merged)} total in "
        f"{OUT.relative_to(ROOT)}; {len(skipped)} skipped → .cache/stress-skipped.txt"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
