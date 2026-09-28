// Grammar lessons ("rule of the day"): weekday rotation, lesson choice, cloze card ids, answer checking.
// Pure functions only (no zod), so the Mini App can import them from "@el/core/grammar".

type Lang = "lt" | "es" | "fr";

/** PLAN §3.6: which language's rule comes on each weekday (0 = Sunday). Thursday is LT reading, Sunday LT writing: no rule. */
export const GRAMMAR_ROTATION: readonly (Lang | null)[] = [null, "lt", "es", "lt", null, "es", "lt"];

/** The language of the rule of the day for a local calendar day ("2026-09-28"), or null (Thursday, Sunday). */
export function grammarLangForDay(day: string): Lang | null {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return GRAMMAR_ROTATION[weekday] ?? null;
}

/** The first lesson of `lang` (by `order`) that isn't done yet. */
export function pickLesson<L extends { id: string; order: number }>(lessons: readonly L[], lang: Lang, done: ReadonlySet<string>): L | null {
  return (
    lessons
      .filter((l) => l.id.startsWith(`${lang}-`) && !done.has(l.id))
      .sort((a, b) => a.order - b.order)[0] ?? null
  );
}

/** Review card for exercise `index` (0-based) of a lesson: "lt-g-0001:cloze1". Keep exercises append-only. */
export const exerciseCardId = (lessonId: string, index: number) => `${lessonId}:cloze${index + 1}`;

/** Inverse of exerciseCardId; null for other card kinds. */
export function parseExerciseCardId(cardId: string): { lessonId: string; index: number } | null {
  const m = /^((?:lt|es|fr)-g-\d{4}):cloze(\d+)$/.exec(cardId);
  return m ? { lessonId: m[1]!, index: Number(m[2]) - 1 } : null;
}

/** The blank in a cloze sentence. */
export const BLANK = "___";

/** Splits "Aš ___ namie." into ["Aš ", " namie."]. */
export function clozeParts(text: string): [string, string] {
  const i = text.indexOf(BLANK);
  return i < 0 ? [text, ""] : [text.slice(0, i), text.slice(i + BLANK.length)];
}

const normalize = (s: string) =>
  s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[.,!?;:¿¡"«»„“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const stripMarks = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "").normalize("NFC");

export type AnswerResult = "correct" | "almost" | "wrong";

/**
 * Compares a typed answer with the accepted ones, ignoring case, punctuation and extra spaces.
 * "almost" = right except for diacritics (dirbciau for dirbčiau, esta for está).
 */
export function checkAnswer(input: string, accepted: readonly string[]): AnswerResult {
  const got = normalize(input);
  if (!got) return "wrong";
  const want = accepted.map(normalize);
  if (want.includes(got)) return "correct";
  const bare = stripMarks(got);
  return want.some((w) => stripMarks(w) === bare) ? "almost" : "wrong";
}
