// Grammar lessons ("rule of the day"): weekday rotation, lesson choice, cloze card ids, answer checking.
// Pure functions only (no zod), so the Mini App can import them from "@el/core/grammar".

type Lang = "lt" | "es" | "fr";

/** PLAN §3.6: which language's rule comes on each weekday (0 = Sunday). Thursday is LT reading, Sunday LT writing: no rule. */
export const GRAMMAR_ROTATION: readonly (Lang | null)[] = [null, "lt", "es", "lt", null, "es", "lt"];

/** French proper starts here (PLAN §3.5); before it, Saturdays carry the French sounds track. */
export const FR_START = "2027-04-01";

/** French lessons with `order` up to this are the sounds track; higher ones (A1 grammar, order 101+) wait for FR_START. */
export const FR_SOUNDS_MAX_ORDER = 99;

/**
 * Candidate languages for the rule of a local calendar day ("2026-09-28"), in order of preference: the first one
 * that still has a lesson left wins. Empty on Thursday and Sunday.
 * - Saturday before FR_START: French sounds micro-lesson, else Lithuanian.
 * - Friday from FR_START: French every other week, else Spanish (PLAN §3.6).
 */
export function grammarLangsForDay(day: string): Lang[] {
  const t = Date.parse(`${day}T12:00:00Z`);
  const weekday = new Date(t).getUTCDay();
  const base = GRAMMAR_ROTATION[weekday];
  if (!base) return [];
  if (weekday === 6 && day < FR_START) return ["fr", base];
  const week = Math.floor(t / (7 * 86_400_000));
  if (weekday === 5 && day >= FR_START && week % 2 === 1) return ["fr", base];
  return [base];
}

/** The preferred language of the rule of the day, or null (Thursday, Sunday). */
export function grammarLangForDay(day: string): Lang | null {
  return grammarLangsForDay(day)[0] ?? null;
}

/** The first lesson of `lang` (by `order`) that isn't done yet. With `day`, French grammar waits for FR_START. */
export function pickLesson<L extends { id: string; order: number }>(
  lessons: readonly L[],
  lang: Lang,
  done: ReadonlySet<string>,
  day?: string,
): L | null {
  const frHeld = day !== undefined && lang === "fr" && day < FR_START;
  return (
    lessons
      .filter((l) => l.id.startsWith(`${lang}-`) && !done.has(l.id) && !(frHeld && l.order > FR_SOUNDS_MAX_ORDER))
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
    .replace(/[’ʼ‘]/g, "'") // iOS types curly apostrophes: l’ami = l'ami
    .replace(/[.,!?;:¿¡"«»„“”]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const stripMarks = (s: string) => s.normalize("NFD").replace(/\p{M}+/gu, "").normalize("NFC");

export type AnswerResult = "correct" | "almost" | "wrong";

/**
 * Compares a typed answer with the accepted ones, ignoring case, punctuation and extra spaces.
 * "almost" = right except for diacritics (dirbciau for dirbčiau, esta for está).
 * `strict` (exam practice, docs/EXTENSION-PLAN.md §6.5): a missing or wrong diacritic is "wrong", as in the A2 exam.
 */
export function checkAnswer(input: string, accepted: readonly string[], strict = false): AnswerResult {
  const got = normalize(input);
  if (!got) return "wrong";
  const want = accepted.map(normalize);
  if (want.includes(got)) return "correct";
  const bare = stripMarks(got);
  return !strict && want.some((w) => stripMarks(w) === bare) ? "almost" : "wrong";
}
