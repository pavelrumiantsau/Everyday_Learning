#!/usr/bin/env python3
"""Pronunciation audio for content items, with the free edge-tts voices (PLAN §6.3).

Input: a JSON list of {id, word, ex?} from scripts/audio-texts.ts (what to say; see packages/core/src/audio.ts).
Output: apps/miniapp/public/audio/<lang>/<id>.mp3 (word) and <id>-ex.mp3 (first example), plus
apps/miniapp/public/audio/manifest.json: {id: {word: hash, ex: hash}}. Only files whose text, voice or speed changed
are generated again; files of removed items (or removed examples) are deleted.

Usage (normally via `pnpm content:audio`; one-time setup in docs/SETUP.md):
  .cache/venv/bin/python scripts/tts.py <texts.json> [--dry-run] [--limit N]
  python3 scripts/tts.py --self-test        # checks the pure logic, no network or edge-tts needed
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps/miniapp/public/audio"
MANIFEST = OUT / "manifest.json"

VOICES = {"lt": "lt-LT-OnaNeural", "es": "es-ES-ElviraNeural", "fr": "fr-FR-DeniseNeural"}
# A little slower than normal speech: easier to hear every sound.
RATE = "-10%"
CONCURRENCY = 4
KINDS = ("word", "ex")


def lang_of(item_id: str) -> str:
    return item_id[:2]


def file_name(item_id: str, kind: str) -> str:
    return f"{item_id}{'-ex' if kind == 'ex' else ''}.mp3"


def text_hash(text: str, voice: str, rate: str = RATE) -> str:
    """Changes when anything that affects the sound changes."""
    return hashlib.sha256(f"{voice}|{rate}|{text}".encode()).hexdigest()[:10]


def plan(texts: list[dict], manifest: dict) -> tuple[dict, list[tuple[str, str, str, str]], list[str]]:
    """Returns (wanted manifest, jobs [(id, kind, text, voice)] to generate, relative files to delete)."""
    wanted: dict[str, dict[str, str]] = {}
    jobs: list[tuple[str, str, str, str]] = []
    for t in texts:
        voice = VOICES.get(lang_of(t["id"]))
        if not voice:
            continue
        for kind in KINDS:
            text = (t.get(kind) or "").strip()
            if not text:
                continue
            h = text_hash(text, voice)
            wanted.setdefault(t["id"], {})[kind] = h
            if manifest.get(t["id"], {}).get(kind) != h:
                jobs.append((t["id"], kind, text, voice))
    stale = [
        f"{lang_of(i)}/{file_name(i, kind)}"
        for i, kinds in manifest.items()
        for kind in kinds
        if kind not in wanted.get(i, {})
    ]
    return wanted, jobs, stale


def write_manifest(manifest: dict) -> None:
    ordered = {i: {k: manifest[i][k] for k in KINDS if k in manifest[i]} for i in sorted(manifest)}
    tmp = MANIFEST.with_suffix(".tmp")
    tmp.write_text(json.dumps(ordered, ensure_ascii=False, separators=(",", ":")) + "\n")
    tmp.replace(MANIFEST)


async def generate(jobs, manifest: dict, wanted: dict) -> int:
    import edge_tts  # only needed when there is something to generate

    sem = asyncio.Semaphore(CONCURRENCY)
    failed = 0
    done = 0

    async def one(item_id: str, kind: str, text: str, voice: str) -> None:
        nonlocal failed, done
        path = OUT / lang_of(item_id) / file_name(item_id, kind)
        path.parent.mkdir(parents=True, exist_ok=True)
        async with sem:
            for attempt in range(3):
                try:
                    tmp = path.with_suffix(".part")
                    await edge_tts.Communicate(text, voice, rate=RATE).save(str(tmp))
                    if tmp.stat().st_size == 0:
                        raise RuntimeError("empty audio")
                    tmp.replace(path)
                    manifest.setdefault(item_id, {})[kind] = wanted[item_id][kind]
                    done += 1
                    if done % 25 == 0:
                        write_manifest(manifest)  # keep progress if interrupted
                        print(f"  … {done}/{len(jobs)}", flush=True)
                    return
                except Exception as e:  # network hiccups: retry a couple of times
                    if attempt == 2:
                        failed += 1
                        print(f"✗ {item_id} {kind}: {e}", file=sys.stderr)
                    else:
                        await asyncio.sleep(2 * (attempt + 1))

    await asyncio.gather(*(one(*j) for j in jobs))
    return failed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("texts", nargs="?")
    ap.add_argument("--dry-run", action="store_true", help="only show what would change")
    ap.add_argument("--limit", type=int, default=0, help="generate at most N files (for trying out)")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    if not args.texts:
        ap.error("texts.json is required")

    texts = json.loads(Path(args.texts).read_text())
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    wanted, jobs, stale = plan(texts, manifest)
    if args.limit:
        jobs = jobs[: args.limit]
    print(f"audio: {len(jobs)} to generate, {len(stale)} to delete, {sum(len(v) for v in wanted.values())} in total")
    if args.dry_run:
        for j in jobs[:20]:
            print(f"  + {j[0]} {j[1]}: {j[2]}")
        for s in stale[:20]:
            print(f"  - {s}")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    for rel in stale:
        (OUT / rel).unlink(missing_ok=True)
    # Keep only entries that are still wanted and unchanged; generated ones are added back as they finish.
    manifest = {
        i: {k: h for k, h in kinds.items() if wanted.get(i, {}).get(k) == h}
        for i, kinds in manifest.items()
    }
    manifest = {i: kinds for i, kinds in manifest.items() if kinds}
    failed = asyncio.run(generate(jobs, manifest, wanted)) if jobs else 0
    write_manifest(manifest)

    files = [p for p in OUT.rglob("*.mp3")]
    size = sum(p.stat().st_size for p in files)
    print(f"✓ {len(files)} files, {size / 1024 / 1024:.1f} MiB in {OUT.relative_to(ROOT)}")
    if failed:
        print(f"✗ {failed} file(s) failed; run again to retry", file=sys.stderr)
        return 1
    return 0


def self_test() -> int:
    """Checks the incremental logic without network access."""
    texts = [
        {"id": "lt-w-0001", "word": "laikas, laiko", "ex": "Laikas bėga."},
        {"id": "es-p-0001", "word": "¡Hola!"},
        {"id": "xx-w-0001", "word": "skipped: unknown language"},
    ]
    wanted, jobs, stale = plan(texts, {})
    assert [(j[0], j[1]) for j in jobs] == [("lt-w-0001", "word"), ("lt-w-0001", "ex"), ("es-p-0001", "word")], jobs
    assert stale == [] and "xx-w-0001" not in wanted
    assert jobs[0][3] == "lt-LT-OnaNeural" and jobs[2][3] == "es-ES-ElviraNeural"

    # Nothing changed → nothing to do.
    _, jobs2, stale2 = plan(texts, wanted)
    assert jobs2 == [] and stale2 == []

    # Changed example, removed item → regenerate one, delete the removed item's file.
    old = dict(wanted, **{"es-p-0002": {"word": "abc"}})
    texts3 = [{"id": "lt-w-0001", "word": "laikas, laiko", "ex": "Laikas greitai bėga."}, texts[1]]
    _, jobs3, stale3 = plan(texts3, old)
    assert [(j[0], j[1]) for j in jobs3] == [("lt-w-0001", "ex")], jobs3
    assert stale3 == ["es/es-p-0002.mp3"], stale3

    # Example removed → its file is deleted.
    _, _, stale4 = plan([{"id": "lt-w-0001", "word": "laikas, laiko"}, texts[1]], wanted)
    assert stale4 == ["lt/lt-w-0001-ex.mp3"], stale4

    assert file_name("lt-w-0001", "ex") == "lt-w-0001-ex.mp3" and file_name("lt-w-0001", "word") == "lt-w-0001.mp3"
    assert text_hash("a", "v") != text_hash("a", "w") != text_hash("b", "w")
    print("✓ tts.py self-test")
    return 0


if __name__ == "__main__":
    os.chdir(ROOT)
    sys.exit(main())
