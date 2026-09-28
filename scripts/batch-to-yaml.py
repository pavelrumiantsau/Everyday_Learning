# Turns a scripts/batches/*.py table into content YAML, pulling example text + translation from Tatoeba by id.
# Usage: python3 scripts/batch-to-yaml.py scripts/batches/lt-b1-0017.py lt 17 content/lt/vocab/b1-0017.yaml
import runpy, sys, json
batch, lang, start, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
cfg = {"lt": ("lit_sentences.tsv", "rus_sentences.tsv", "lit-rus_links.tsv", "ru"),
       "es": ("spa_sentences.tsv", "eng_sentences.tsv", "spa-eng_links.tsv", "en")}[lang]
PLURAL_ONLY = set(runpy.run_path(batch).get("PLURAL_ONLY", []))
rows = [(r.split("|") + [""])[:9] for r in runpy.run_path(batch)["ROWS"].strip().splitlines()]
want = {r[6] for r in rows}
def load(f, ids=None):
    m = {}
    for line in open(f".cache/sources/{f}", encoding="utf-8"):
        i, _, t = line.rstrip("\n").split("\t", 2)
        if ids is None or i in ids: m[i] = t
    return m
src = load(cfg[0], want)
links = {}
for line in open(f".cache/sources/{cfg[2]}", encoding="utf-8"):
    a, b = line.split()
    if a in want: links.setdefault(a, []).append(b)
tr = load(cfg[1], {b for bs in links.values() for b in bs})
q = lambda s: json.dumps(s, ensure_ascii=False)
out_lines = [f"# Generated from {batch} by scripts/batch-to-yaml.py.",
             "# Examples: Tatoeba (tatoeba.org), CC-BY 2.0 FR — text and translation copied verbatim by sentence id.",
             "# Meanings and notes: written with Claude Code; stress marks to be added after checking lkz.lt."]
seen = set()
for n, (kind, text, pos, gender, cefr, meaning, tid, note, forms) in enumerate(rows):
    assert text not in seen, f"duplicate {text}"; seen.add(text)
    assert tid in src, f"{text}: tatoeba {tid} not found"
    trans = min((tr[b] for b in links.get(tid, []) if b in tr), key=len)
    iid = f"{lang}-{kind}-{start + n:04d}"
    out_lines += [f"- id: {iid}", f"  type: {'word' if kind == 'w' else 'phrase'}", f"  cefr: {cefr}", f"  text: {q(text)}"]
    if pos: out_lines.append(f"  pos: {pos}")
    if gender: out_lines.append(f"  gender: {gender}")
    if forms and pos == "noun":
        out_lines.append(f"  gen: {q(forms.strip())}")
        if text in PLURAL_ONLY: out_lines.append("  plural_only: true")
    elif forms:
        pres, past = [f.strip() for f in forms.split(",")]
        out_lines.append(f"  forms: {{ pres: {q(pres)}, past: {q(past)} }}")
    out_lines.append(f"  meaning: {{ {cfg[3]}: {q(meaning)} }}")
    if note: out_lines.append(f"  note: {{ {cfg[3]}: {q(note)} }}")
    out_lines += ["  examples:", f"    - {{ text: {q(src[tid])}, translation: {q(trans)}, source: \"tatoeba:{tid}\" }}"]
open(out, "w", encoding="utf-8").write("\n".join(out_lines) + "\n")
print(f"✓ {len(rows)} items → {out} ({lang}-*-{start:04d} … {start + len(rows) - 1:04d})")
