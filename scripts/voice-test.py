# Builds the 50-sentence voice test (docs/EXTENSION-PLAN.md §7.2): Reginutė (Piper, CC BY 4.0) next to the current
# edge-tts voice, for listening by the owner. Output: .cache/voices/test/ (index.html + audio), local only — nothing is
# committed or published. Usage: pnpm build:content && python3 scripts/voice-test.py "$PWD", then open the index.html.
# One-time setup (all in .cache/, git-ignored):
#   python3 -m venv .cache/voices/venv && .cache/voices/venv/bin/pip install "piper-tts==1.7.0"
#   git clone --depth 1 https://github.com/RobertasTa/reginute .cache/voices/reginute     # phonemizer (GPL-3.0, local tool only)
#   model + config (CC BY 4.0) from https://github.com/kubataba/sayfable-models/releases/tag/piper-lt-v1 into
#   .cache/voices/piper-lt/; SHA-256 of the .onnx must match the author's hf/SHA256SUMS (0417c4ef…986ee)
#   edge-tts in .cache/venv (docs/SETUP.md «Audio») for the reference column
import json, os, random, subprocess, sys, html
root = sys.argv[1]
V = os.path.join(root, ".cache/voices")
out = os.path.join(V, "test"); os.makedirs(out, exist_ok=True)
items = {i["id"]: i for i in json.load(open(os.path.join(root, "apps/worker/src/generated/content.json")))}
course = json.load(open(os.path.join(root, "apps/worker/src/generated/course.json")))
lessons = {l["id"]: l for l in json.load(open(os.path.join(root, "apps/worker/src/generated/grammar.json")))}
random.seed(7)
words = [items[w] for u in course["units"] for w in u["words"] if items[w].get("stress")]
phrases = [items[p] for u in course["units"] for p in u["phrases"]]
examples = [e for u in course["units"] for l in u["lessons"] for e in lessons[l]["examples"]]
pick = [("слово", w["text"], w["stress"], w["meaning"].get("ru","")) for w in random.sample(words, 20)]
pick += [("фраза", p["text"], "", p["meaning"].get("ru","")) for p in random.sample(phrases, 15)]
pick += [("предложение", e["text"], "", e["translation"]) for e in random.sample(examples, 15)]
rows = []
for n, (kind, text, stressed, meaning) in enumerate(pick, 1):
    p_wav, e_mp3 = f"{n:02d}-reginute.wav", f"{n:02d}-edge.mp3"
    if not os.path.exists(os.path.join(out, p_wav)):
        subprocess.run([os.path.join(V, "venv/bin/python"), os.path.join(V, "reginute/demo_piper_wheel.py"),
                        os.path.join(V, "piper-lt/lt_LT-reginute1-medium.onnx"), os.path.join(V, "piper-lt/lt_LT-reginute1-medium.onnx.json"),
                        text, os.path.join(out, p_wav)], check=True, capture_output=True)
    if not os.path.exists(os.path.join(out, e_mp3)):
        subprocess.run([os.path.join(root, ".cache/venv/bin/edge-tts"), "--voice", "lt-LT-OnaNeural", "--rate=-10%", "--text", text,
                        "--write-media", os.path.join(out, e_mp3)], check=True, capture_output=True)
    rows.append(f"<tr><td>{n}</td><td>{kind}</td><td><b>{html.escape(stressed or text)}</b><br><small>{html.escape(meaning)}</small></td>"
                f"<td><audio controls preload='none' src='{p_wav}'></audio></td><td><audio controls preload='none' src='{e_mp3}'></audio></td>"
                f"<td><label><input type='checkbox'> ошибка</label></td></tr>")
page = f"""<!doctype html><meta charset="utf-8"><title>Voice test</title>
<style>body{{font:15px system-ui;margin:24px;max-width:1000px}}td{{padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:middle}}audio{{width:220px}}small{{color:#777}}</style>
<h1>Тест голоса: Reginutė (открытая лицензия) vs. текущий голос</h1>
<p>50 образцов из курса. Слушайте прежде всего <b>ударение</b> (у слов оно показано знаком) и понятность.
Отметьте ошибки голоса Reginutė. Колонка «Сейчас» — текущий голос (edge-tts), только для сравнения.</p>
<table><tr><th>#</th><th>что</th><th>текст</th><th>Reginutė</th><th>Сейчас</th><th></th></tr>{''.join(rows)}</table>"""
open(os.path.join(out, "index.html"), "w").write(page)
print(os.path.join(out, "index.html"), len(rows))
