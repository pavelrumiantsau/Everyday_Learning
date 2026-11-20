#!/usr/bin/env python3
"""Checks that every word of the Ukrainian blocks' correct answers exists in the dictionary (docs/UK-GRAMMAR-PLAN.md §7).

The dictionary is the Ukrainian morphological dictionary of pymorphy3 (built from VESUM / LanguageTool data). It
accepts variant and older spellings too, so this is an existence check — it catches made-up forms and typos
(«піджарити», «зависливий», «сімь») — and complements scripts/uk-check.py (LanguageTool), which judges the norm.

With --hints it also reviews cloze exercises whose hint is one Ukrainian word (the base form: hint «нести», answer
«несла») and lists answers that are not a form of the hint and don't share its root — suppletive forms, Russian
hints and possible mistakes, for a person to read. These warnings never fail the run.

Setup (once):  python3 -m pip install --target .cache/pylib pymorphy3 pymorphy3-dicts-uk
Usage:         python3 scripts/uk-vesum.py [--hints] [block files…]      (default: all blocks + the cheat sheet)
Checked exceptions (words the dictionary lacks but a person verified): content/uk/vesum-allow.yaml.
Exit code 1 when an unknown word is not in the allow list.
"""
import importlib.util
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / ".cache" / "pylib"))
try:
    import pymorphy3
except ImportError:
    sys.exit("pymorphy3 is missing: python3 -m pip install --target .cache/pylib pymorphy3 pymorphy3-dicts-uk")

# The sentence collector of uk-check.py (right / wrong sentences of a block).
_spec = importlib.util.spec_from_file_location("uk_check", ROOT / "scripts" / "uk-check.py")
uk_check = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(uk_check)

ALLOW_FILE = ROOT / "content" / "uk" / "vesum-allow.yaml"
WORD = re.compile(r"[А-Яа-яЁёІіЇїЄєҐґ'’ʼ́-]+")
UK_LETTERS = re.compile(r"^[а-щьюяіїєґ'-]+$")
morph = pymorphy3.MorphAnalyzer(lang="uk")


def norm(word):
    return word.replace("́", "").replace("’", "'").replace("ʼ", "'").lower().strip("-'")


def known(word):
    """In the dictionary — a hyphenated word also counts if each part is."""
    if not word or morph.word_is_known(word):
        return True
    return "-" in word and all(known(p) for p in word.split("-") if p)


def lemmas(word):
    return {p.normal_form for p in morph.parse(word)}


def texts(block):
    """Correct Ukrainian texts of a block: right sentences (as uk-check sees them), stress words and the right option
    of questions about the language (e.g. «фрикативний (як у білоруській)»)."""
    out = [(t, where) for t, right, where in uk_check.sentences(block) if right]
    for i, ex in enumerate(block.get("exercises", [])):
        where = f"x{i + 1} {ex['type']}"
        if ex["type"] == "stress":
            out.append((ex["word"], where))
        elif ex["type"] == "choice" and uk_check.BLANK not in ex["text"] and not uk_check.is_meta(ex["options"][ex["answer"]]):
            if not all(uk_check.is_sentence(o) for o in ex["options"]):
                out.append((ex["options"][ex["answer"]], where))
    return out


def lemma_warnings(block):
    """Cloze with a one-word Ukrainian hint: the answer should be a form of the hint. Answers sharing the first three
    letters with the hint are taken as derivations (директор → директорка, мама → мамин, читати → читаючи) and skipped,
    so what is left are suppletive forms (добрий → кращий), Russian hints and possible mistakes — for a person to read."""
    for i, ex in enumerate(block.get("exercises", [])):
        if ex["type"] != "cloze" or "hint" not in ex:
            continue
        hint = norm(ex["hint"].split(",")[0].strip())
        answers = [norm(a) for a in [ex["answer"], *ex.get("also", [])]]
        if not UK_LETTERS.match(hint) or " " in ex["answer"] or not morph.word_is_known(hint):
            continue
        if any(lemmas(hint) & lemmas(a) or a[:3] == hint[:3] for a in answers):
            continue
        yield f"~ {block['id']} x{i + 1}: «{ex['answer']}» is not a form of the hint «{ex['hint']}» (check: derivation or a mistake?)"


# Not words to look up: transcriptions «[хл’іб]», ordinal endings in «5-му», letters named on their own («д твердий»).
NOT_WORDS = re.compile(r"\[[^\]]*\]|\d+-[а-яіїєґ]+")


def words_of(text):
    for raw in WORD.findall(NOT_WORDS.sub(" ", text)):
        w = norm(raw)
        if len(w) > 1:
            yield w


def main(args):
    sys.stdout.reconfigure(encoding="utf-8")
    review_hints = "--hints" in args
    paths = [a for a in args if not a.startswith("--")]
    allow = {norm(a["word"]) for a in (yaml.safe_load(ALLOW_FILE.read_text(encoding="utf-8")) or [])} if ALLOW_FILE.exists() else set()
    files = [Path(p) for p in paths] or sorted((ROOT / "content" / "uk" / "blocks").glob("*/*.yaml"))
    unknown, warnings, words = {}, [], 0
    for f in files:
        block = yaml.safe_load(f.read_text(encoding="utf-8"))
        for text, where in texts(block):
            for w in words_of(text):
                words += 1
                if not known(w) and w not in allow:
                    unknown.setdefault(w, []).append(f"{block['id']} {where}: «{text}»")
        if review_hints:
            warnings += lemma_warnings(block)
    if not paths:
        for r in yaml.safe_load((ROOT / "content" / "uk" / "cheatsheet.yaml").read_text(encoding="utf-8")):
            for w in words_of(r["example"]):
                words += 1
                if not known(w) and w not in allow:
                    unknown.setdefault(w, []).append(f"cheatsheet: «{r['example']}»")
    for w, places in sorted(unknown.items()):
        print(f"✗ «{w}» is not in the dictionary — {places[0]}" + (f" (+{len(places) - 1} more)" if len(places) > 1 else ""))
    for line in warnings:
        print(line)
    print(f"{words} words in {len(files)} blocks: {len(unknown)} unknown, {len(warnings)} hint warnings")
    return 1 if unknown else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
