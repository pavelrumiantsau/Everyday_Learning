#!/usr/bin/env python3
"""Search Tatoeba sentence pairs to pick examples for lessons, vocabulary and texts.

Needs `pnpm content:sources` first (lit/spa/fra sentences + links in .cache/sources). The pairs are indexed once
into .cache/tatoeba-<lang>.pkl. Examples must be copied verbatim by id (see prompts/content/_common.md).

Usage:
  python3 scripts/tatoeba.py lt 'regex' [max_words] [count]      # sentences matching a regex, shortest first
  python3 scripts/tatoeba.py lt --words priimti pavojus …          # 2 short examples per word stem (auto-pick for review)

Languages: lt (translations in Russian), es and fr (translations in English).
"""
from __future__ import annotations

import bisect
import os
import pickle
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, ".cache", "sources")
CFG = {"lt": ("lit", "rus"), "es": ("spa", "eng"), "fr": ("fra", "eng")}


def load(lang: str) -> dict[int, tuple[str, str]]:
    path = os.path.join(ROOT, ".cache", f"tatoeba-{lang}.pkl")
    if os.path.exists(path):
        return pickle.load(open(path, "rb"))
    src, tr = CFG[lang]
    read = lambda f: {int(l.split("\t", 2)[0]): l.rstrip("\n").split("\t", 2)[2] for l in open(os.path.join(SRC, f), encoding="utf8")}
    a, b = read(f"{src}_sentences.tsv"), read(f"{tr}_sentences.tsv")
    pairs: dict[int, tuple[str, str]] = {}
    for line in open(os.path.join(SRC, f"{src}-{tr}_links.tsv")):
        x, y = map(int, line.split())
        if x in a and y in b and (x not in pairs or len(b[y]) < len(pairs[x][1])):
            pairs[x] = (a[x], b[y])  # keep the shortest translation, like scripts/batch-to-yaml.py
    pickle.dump(pairs, open(path, "wb"))
    return pairs


def by_regex(pairs, rx: str, max_words: int, count: int) -> None:
    r = re.compile(rx)
    out = sorted((p for p in pairs.items() if r.search(p[1][0]) and len(p[1][0].split()) <= max_words), key=lambda p: (len(p[1][0]), p[0]))
    for i, (s, t) in out[:count]:
        print(f"{i}\t{s}\t{t}")


def by_words(pairs, words: list[str]) -> None:
    toks: dict[str, list[int]] = {}
    for i, (s, _) in pairs.items():
        ws = re.findall(r"\w+", s.lower())
        if 3 <= len(ws) <= 8 and len(s) >= 14:
            for t in set(ws):
                toks.setdefault(t, []).append(i)
    keys = sorted(toks)
    for w in words:
        stem = w.lower()
        for suf in ("iai", "ai", "as", "is", "ys", "us", "a", "ė", "ės", "tis", "ti", "ar", "er", "ir", "o"):
            if stem.endswith(suf) and len(stem) - len(suf) >= 4:
                stem = stem[: -len(suf)]
                break
        lo, cand = bisect.bisect_left(keys, stem), []
        while lo < len(keys) and keys[lo].startswith(stem):
            if len(keys[lo]) - len(stem) <= 5:
                cand += toks[keys[lo]]
            lo += 1
        best = sorted(set(cand), key=lambda i: (len(pairs[i][0]), i))[:2]
        for i in best or [None]:
            print(f"{w}\t{i}\t{pairs[i][0]}\t{pairs[i][1]}" if i else f"{w}\t-\t-\t-")


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] not in CFG:
        print(__doc__)
        sys.exit(1)
    data = load(sys.argv[1])
    if sys.argv[2] == "--words":
        by_words(data, sys.argv[3:])
    else:
        by_regex(data, sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 9, int(sys.argv[4]) if len(sys.argv) > 4 else 10)
