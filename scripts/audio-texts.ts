// Writes what to say for every content item and grammar lesson (see packages/core/src/audio.ts) for scripts/tts.py.
// Usage: tsx scripts/audio-texts.ts <out.json>   (run `pnpm build:content` first; `pnpm content:audio` does both)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { audioTexts, lessonAudioTexts, listeningSpeech, type Item, type Lesson, type Listening } from "../packages/core/src/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = process.argv[2] ?? join(root, ".cache/audio-texts.json");
const items = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/content.json"), "utf8")) as Item[];
const lessons = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/grammar.json"), "utf8")) as Lesson[];
// Foundation-only content is voiced by Reginutė (scripts/tts_reginute.py, open licence); tts.py leaves it alone.
// Words the course shares with the original plan keep their current audio, so the owner's bot sounds the same.
const reginute = new Set([
  ...items.filter((i) => i.track === "foundation").map((i) => i.id),
  ...lessons.filter((l) => l.track === "foundation").flatMap((l) => lessonAudioTexts(l).map((t) => t.id)),
]);
const listening = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/listening.json"), "utf8")) as Listening[];
const texts = [
  ...[...items.map(audioTexts), ...lessons.flatMap(lessonAudioTexts)].map((t) => (reginute.has(t.id) ? { ...t, voice: "reginute" } : t)),
  ...listening.map((l) => ({ id: l.id, word: listeningSpeech(l), voice: "reginute" })),
];
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(texts, null, 1));
console.log(`✓ ${items.length} items + ${lessons.length} lessons → ${texts.length} texts (${reginute.size} for Reginutė) → ${out}`);
