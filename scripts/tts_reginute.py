#!/usr/bin/env python3
"""Pronunciation audio for the Lithuanian foundation course with the open voice Reginutė (docs/EXTENSION-PLAN.md §7).

Voice: lt_LT-reginute1-medium (Piper), CC BY 4.0 — LIEPA corpus, Vilnius University; trained by Robertas Tarasevičius.
Stress-aware phonemizer: RobertasTa/reginute (GPL-3.0) — runs only here, to make audio; it is not shipped.
Only entries that scripts/audio-texts.ts marks "voice": "reginute" are handled; scripts/tts.py (edge-tts) leaves them
alone. Same files and manifest as tts.py: apps/miniapp/public/audio/lt/<id>.mp3 and <id>-ex.mp3.

Usage: pnpm content:audio:course   (one-time setup: scripts/voice-test.py header; plus `pip install lameenc` in that venv)
       .cache/voices/venv/bin/python scripts/tts_reginute.py .cache/audio-texts.json [--dry-run] [--limit N]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps/miniapp/public/audio"
MANIFEST = OUT / "manifest.json"
VOICES = ROOT / ".cache/voices"
VOICE = "reginute1-medium"
LENGTH_SCALE = 1.30  # the author's recommended pace (a little slower than normal speech)
KINDS = ("word", "ex")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tts import file_name, text_hash, write_manifest  # noqa: E402  same naming and hashing as the edge-tts files


def plan(texts: list[dict], manifest: dict) -> list[tuple[str, str, str, str]]:
    jobs = []
    for t in texts:
        if t.get("voice") != "reginute":
            continue
        for kind in KINDS:
            text = (t.get(kind) or "").strip()
            if text:
                h = text_hash(text, VOICE, str(LENGTH_SCALE))
                if manifest.get(t["id"], {}).get(kind) != h:
                    jobs.append((t["id"], kind, text, h))
    return jobs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("texts")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    texts = json.loads(Path(args.texts).read_text())
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    jobs = plan(texts, manifest)
    if args.limit:
        jobs = jobs[: args.limit]
    print(f"reginute: {len(jobs)} to generate")
    if args.dry_run or not jobs:
        for j in jobs[:20]:
            print(f"  + {j[0]} {j[1]}: {j[2]}")
        return 0

    sys.path.insert(0, str(VOICES / "reginute"))
    import lameenc
    from phonemize_lithuanian import LithuanianPhonemizer
    from piper import PiperVoice
    from synth_reginute import ReginuteSynth, i_int16
    try:
        from skaiciu_pletiklis import isplesk
    except Exception:
        isplesk = None

    voice = PiperVoice.load(str(VOICES / "piper-lt/lt_LT-reginute1-medium.onnx"), config_path=str(VOICES / "piper-lt/lt_LT-reginute1-medium.onnx.json"))
    synth = ReginuteSynth(voice, LithuanianPhonemizer(), length_scale=LENGTH_SCALE, expand_text=isplesk, min_zodziu=0, santrumpu_letumas=1.15)
    failed = 0
    for n, (item_id, kind, text, h) in enumerate(jobs, 1):
        try:
            pcm = i_int16(synth.synthesize(text))
            enc = lameenc.Encoder()
            enc.set_bit_rate(48)
            enc.set_in_sample_rate(synth.sr)
            enc.set_channels(1)
            enc.set_quality(2)
            mp3 = enc.encode(pcm) + enc.flush()
            path = OUT / item_id[:2] / file_name(item_id, kind)
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_suffix(".part")
            tmp.write_bytes(mp3)
            tmp.replace(path)
            manifest.setdefault(item_id, {})[kind] = h
        except Exception as e:
            failed += 1
            print(f"✗ {item_id} {kind}: {e}", file=sys.stderr)
        if n % 100 == 0:
            write_manifest(manifest)
            print(f"  … {n}/{len(jobs)}", flush=True)
    write_manifest(manifest)
    print(f"✓ {len(jobs) - failed} files with Reginutė")
    return 1 if failed else 0


if __name__ == "__main__":
    os.chdir(ROOT)
    sys.exit(main())
