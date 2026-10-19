// Writes what to say for every content item and grammar lesson (see packages/core/src/audio.ts) for scripts/tts.py.
// Usage: tsx scripts/audio-texts.ts <out.json>   (run `pnpm build:content` first; `pnpm content:audio` does both)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { audioTexts, courseItemIds, examListeningId, examListeningSpeech, lessonAudioTexts, listeningSpeech, type Course, type Exam, type Item, type Lesson, type Listening } from "../packages/core/src/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = process.argv[2] ?? join(root, ".cache/audio-texts.json");
const items = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/content.json"), "utf8")) as Item[];
const lessons = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/grammar.json"), "utf8")) as Lesson[];
const course = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/course.json"), "utf8")) as Course;
const manifestPath = join(root, "apps/miniapp/public/audio/manifest.json");
const manifest = (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {}) as Record<string, { word?: string }>;
// Same hash as scripts/tts_reginute.py (VOICE, LENGTH_SCALE): tells a Reginutė file from an edge-tts one.
const reginuteHash = (text: string) => createHash("sha256").update(`reginute1-medium|1.3|${text.trim()}`).digest("hex").slice(0, 10);
// Foundation-only content is voiced by Reginutė (scripts/tts_reginute.py, open licence); tts.py leaves it alone.
// Words the course shares with the original plan keep their current audio, so the owner's bot sounds the same; shared
// course words that have no audio yet (new audio is paused for the original plan) get Reginutė, and keep it.
const inCourse = new Set(courseItemIds(course));
const sharedWithoutOldAudio = items.filter((i) => {
  if (i.track === "foundation" || !inCourse.has(i.id)) return false;
  const old = manifest[i.id]?.word;
  return !old || old === reginuteHash(audioTexts(i).word);
});
const reginute = new Set([
  ...items.filter((i) => i.track === "foundation").map((i) => i.id),
  ...sharedWithoutOldAudio.map((i) => i.id),
  ...lessons.filter((l) => l.track === "foundation").flatMap((l) => lessonAudioTexts(l).map((t) => t.id)),
]);
const listening = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/listening.json"), "utf8")) as Listening[];
const exams = JSON.parse(readFileSync(join(root, "apps/worker/src/generated/exams.json"), "utf8")) as Exam[];
const texts = [
  ...[...items.map(audioTexts), ...lessons.flatMap(lessonAudioTexts)].map((t) => (reginute.has(t.id) ? { ...t, voice: "reginute" } : t)),
  ...listening.map((l) => ({ id: l.id, word: listeningSpeech(l), voice: "reginute" })),
  ...exams.flatMap((e) => e.listening.map((t, i) => ({ id: examListeningId(e.id, i), word: examListeningSpeech(t), voice: "reginute" }))),
];
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(texts, null, 1));
console.log(`✓ ${items.length} items + ${lessons.length} lessons → ${texts.length} texts (${reginute.size} for Reginutė) → ${out}`);
