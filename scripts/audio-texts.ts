// Writes what to say for every content item and grammar lesson (see packages/core/src/audio.ts) for scripts/tts.py.
// Usage: tsx scripts/audio-texts.ts <out.json>   (run `pnpm build:content` first; `pnpm content:audio` does both)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { audioTexts, lessonAudioTexts, type Item, type Lesson } from "../packages/core/src/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = process.argv[2] ?? join(root, ".cache/audio-texts.json");
const items = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/content.json"), "utf8")) as Item[];
const lessons = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/grammar.json"), "utf8")) as Lesson[];
const texts = [...items.map(audioTexts), ...lessons.flatMap(lessonAudioTexts)];
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(texts, null, 1));
console.log(`✓ ${items.length} items + ${lessons.length} lessons → ${texts.length} texts → ${out}`);
