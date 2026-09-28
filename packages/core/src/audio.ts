// Pronunciation audio (PLAN §6.3): what is spoken for each item, and where the files live.
// scripts/audio-texts.ts feeds these texts to scripts/tts.py; the Mini App uses the paths and the manifest.

type Speakable = { id: string; text: string; forms?: { pres: string; past: string }; gen?: string; examples?: { text: string }[] };

/** The word as a dictionary entry, without stress marks: "priimti, priima, priėmė", "priežastis, priežasties", or the text. */
export function spokenWord(item: Speakable): string {
  if (item.forms) return `${item.text}, ${item.forms.pres}, ${item.forms.past}`;
  if (item.gen) return `${item.text}, ${item.gen}`;
  return item.text;
}

/** The first example sentence, if any. */
export function spokenExample(item: Speakable): string | undefined {
  const text = item.examples?.[0]?.text.trim();
  return text || undefined;
}

export type AudioKind = "word" | "ex";

/** Path of an item's audio file inside the Mini App (served from apps/miniapp/public/audio). */
export function audioPath(id: string, kind: AudioKind): string {
  return `/audio/${id.slice(0, 2)}/${id}${kind === "ex" ? "-ex" : ""}.mp3`;
}

/** /audio/manifest.json: item id → hash of the spoken text per file (only files that exist are listed). */
export type AudioManifest = Record<string, Partial<Record<AudioKind, string>>>;

/** What to say in each of an item's files (input for scripts/tts.py). */
export function audioTexts(item: Speakable): { id: string; word: string; ex?: string } {
  const ex = spokenExample(item);
  return ex ? { id: item.id, word: spokenWord(item), ex } : { id: item.id, word: spokenWord(item) };
}

/** Grammar lessons reuse the same files (kind "word"): "fr-g-0001-e1" = example 1, "fr-g-0001-x1" = exercise 1. */
export const lessonAudioId = (lessonId: string, part: "e" | "x", index: number) => `${lessonId}-${part}${index + 1}`;

type SpeakableLesson = { id: string; examples: { text: string }[]; exercises: { text: string; answer: string }[] };

/** What to say for a lesson: each example, and each exercise sentence with the blank filled in. */
export function lessonAudioTexts(lesson: SpeakableLesson): { id: string; word: string }[] {
  return [
    ...lesson.examples.map((e, i) => ({ id: lessonAudioId(lesson.id, "e", i), word: e.text.trim() })),
    ...lesson.exercises.map((x, i) => ({ id: lessonAudioId(lesson.id, "x", i), word: x.text.replace("___", x.answer).trim() })),
  ];
}
