// FROZEN copy of packages/core/src/reading.ts at f413d69 (2026-10-08) — the owner's behaviour before the colleagues extension.
// Do not edit: test/legacy-baseline.test.ts compares the live code (legacy profile) against it. See docs/EXTENSION-PLAN.md §4.
// Reading mode: tokenizing graded texts into tappable words, the sentence around a word, text choice, learner item ids.
// Pure functions only (no zod), so the Mini App can import them from "@el/core/reading".

type Lang = "lt" | "es" | "fr";

export interface Token {
  text: string;
  /** true for a word (letters, incl. ą č ę ė į š ų ū ž, á é í ñ ó ú ü…; inner hyphen/apostrophe allowed). */
  word: boolean;
  /** Offset in the source string. */
  start: number;
}

const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

/** Splits a text into word and non-word tokens; joining all `text`s gives the input back. */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    const start = m.index;
    if (start > last) out.push({ text: text.slice(last, start), word: false, start: last });
    out.push({ text: m[0], word: true, start });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false, start: last });
  return out;
}

/** The words of a text, in order. */
export const wordsOf = (text: string): string[] => tokenize(text).filter((t) => t.word).map((t) => t.text);

/** Lookup key of a word: lower case, NFC, typographic apostrophe → '. */
export const normalizeWord = (word: string): string => word.normalize("NFC").trim().toLowerCase().replace(/’/g, "'");

/** Paragraphs of a reading text (blank line = new paragraph; single newlines are spaces). */
export const paragraphs = (text: string): string[] =>
  text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

/** The sentence of `text` that contains the character at `offset` (for word lookups and card examples). */
export function sentenceAt(text: string, offset: number): string {
  const re = /[^.!?…]+(?:[.!?…]+["»”)]*|$)/g;
  for (const m of text.matchAll(re)) {
    if (offset >= m.index && offset < m.index + m[0].length) return m[0].trim();
  }
  return text.trim();
}

/** PLAN §3.6: Thursday is Lithuanian reading day (no grammar rule). `day` is a local date "2026-10-01". */
export const READING_WEEKDAY = 4;
export function isReadingDay(day: string): boolean {
  return new Date(`${day}T12:00:00Z`).getUTCDay() === READING_WEEKDAY;
}

export type ReadingLevel = "A1" | "A2" | "B1" | "B2" | "C1";
const LEVELS: ReadingLevel[] = ["A1", "A2", "B1", "B2", "C1"];
export type ReadingRating = "easy" | "ok" | "hard";
export const READING_RATINGS: ReadingRating[] = ["easy", "ok", "hard"];

/** Level of the next text when nothing has been rated yet: a step above the learner's level (i+1). */
export const DEFAULT_READING_LEVEL: Record<Lang, ReadingLevel> = { lt: "B2", es: "A1", fr: "A1" };

/** Level for the next text after the learner rated one: "easy" → a level up, "hard" → a level down. */
export function nextReadingLevel(last: { cefr: string; rating: ReadingRating } | null, lang: Lang): ReadingLevel {
  if (!last) return DEFAULT_READING_LEVEL[lang];
  const i = Math.max(0, LEVELS.indexOf(last.cefr as ReadingLevel));
  const step = last.rating === "easy" ? 1 : last.rating === "hard" ? -1 : 0;
  return LEVELS[Math.min(LEVELS.length - 1, Math.max(0, i + step))]!;
}

/**
 * The next unread text: of `lang` if given, else Lithuanian first; texts come in id order.
 * With `level`, texts of that level come first, then the nearest levels (harder before easier at equal distance).
 */
export function pickText<T extends { id: string; cefr?: string }>(texts: readonly T[], read: ReadonlySet<string>, lang?: Lang, level?: ReadingLevel): T | null {
  const langs: Lang[] = lang ? [lang] : ["lt", "es", "fr"];
  const distance = (t: T) => {
    if (!level || !t.cefr) return 0;
    const d = LEVELS.indexOf(t.cefr as ReadingLevel) - LEVELS.indexOf(level);
    return d >= 0 ? 2 * d : -2 * d + 1;
  };
  for (const l of langs) {
    const next = texts
      .filter((t) => t.id.startsWith(`${l}-`) && !read.has(t.id))
      .sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id))[0];
    if (next) return next;
  }
  return null;
}

/** Texts the learner pasted in the Mini App (stored in D1, never in the repo): u-r-000001. */
export const ownTextId = (n: number) => `u-r-${String(n).padStart(6, "0")}`;
export function parseOwnTextId(id: string): number | null {
  const m = /^u-r-(\d{6})$/.exec(id);
  return m ? Number(m[1]) : null;
}

/** Words the learner added from reading are stored in D1 as "learner items": u-lt-000123. */
export const learnerItemId = (lang: Lang, n: number) => `u-${lang}-${String(n).padStart(6, "0")}`;

export function parseLearnerItemId(id: string): { lang: Lang; n: number } | null {
  const m = /^u-(lt|es|fr)-(\d{6})$/.exec(id);
  return m ? { lang: m[1] as Lang, n: Number(m[2]) } : null;
}
