// Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md): block ids, answer checking, session picking, mastery.
// Pure functions only (no zod), so the Mini App can import them from "@el/core/uk". The schema is in uk-schema.ts.

/** The 13 parts of the course «Грамматика украинского языка: полный курс до C1», as shown on the map. */
export const UK_PARTS: readonly string[] = [
  "Фонетика и произношение",
  "Чередования и благозвучие",
  "Орфография (Правопис 2019)",
  "Существительное",
  "Прилагательное",
  "Числительное",
  "Местоимение",
  "Глагол",
  "Наречие и служебные слова",
  "Синтаксис и управление",
  "Пунктуация",
  "Русизмы, кальки, суржик",
  "Стилистика C1",
];

/** Exercise `index` (0-based) of a block: "uk-b-0410:x1". Keep exercises append-only. */
export const ukExerciseId = (blockId: string, index: number) => `${blockId}:x${index + 1}`;

/** Inverse of ukExerciseId. */
export function parseUkExerciseId(id: string): { blockId: string; index: number } | null {
  const m = /^(uk-b-\d{4}):x(\d+)$/.exec(id);
  return m ? { blockId: m[1]!, index: Number(m[2]) - 1 } : null;
}

/** Part number of a block id: uk-b-0410 → 4. */
export const ukPartOf = (blockId: string) => Number(blockId.slice(5, 7));

/** Ukrainian vowel letters (stress exercises count them, 1-based). */
export const UK_VOWELS = "аеєиіїоуюя";

/** Positions (in the string) of the vowels of a word. */
export function vowelPositions(word: string): number[] {
  return [...word].flatMap((ch, i) => (UK_VOWELS.includes(ch.toLowerCase()) ? [i] : []));
}

/** Russian-only letters: never in a correct Ukrainian answer (a typo when switching keyboard layouts). */
export const RUSSIAN_ONLY = /[ыэъё]/i;

// Ukrainian answers: apostrophes in any form are the same (', ’, ʼ, ‘, `), the stress mark is ignored. Unlike
// checkAnswer() in grammar.ts there is no "almost": и/й and і/ї differ only by a mark in NFD, and that difference is the point.
const normalizeUk = (s: string) =>
  s
    .normalize("NFD")
    .replace(/́/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/['’ʼ‘`]/g, "’")
    .replace(/[.,!?;:"«»„“”—–]+/g, " ") // the hyphen stays: будь-хто ≠ будь хто
    .replace(/\s+/g, " ")
    .trim();

/** True when the typed answer matches one of the accepted ones (case, punctuation, spaces, apostrophe form ignored). */
export function checkUk(input: string, accepted: readonly string[]): boolean {
  const got = normalizeUk(input);
  return got !== "" && accepted.some((a) => normalizeUk(a) === got);
}

/** Words of a sentence as tappable tokens (spot exercises): punctuation stays attached for display, `word` is bare. */
export function tokens(text: string): { shown: string; word: string }[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((shown) => ({ shown, word: shown.replace(/^[^\p{L}’'ʼ]+|[^\p{L}’'ʼ]+$/gu, "") }));
}

export interface ExerciseStat {
  /** How many times answered (any mode). */
  answers: number;
  /** Result of the latest answer. */
  lastCorrect: boolean;
  /** Epoch ms of the latest answer. */
  lastAt: number;
}

/**
 * The next practice session of a block: exercises never answered first (in order), then ones whose latest answer
 * was wrong, then the ones answered longest ago.
 */
export function pickSession(count: number, stats: ReadonlyMap<number, ExerciseStat>, size = 10): number[] {
  const all = Array.from({ length: count }, (_, i) => i);
  const unseen = all.filter((i) => !stats.has(i));
  const seen = all.filter((i) => stats.has(i));
  const wrong = seen.filter((i) => !stats.get(i)!.lastCorrect).sort((a, b) => stats.get(a)!.lastAt - stats.get(b)!.lastAt);
  const right = seen.filter((i) => stats.get(i)!.lastCorrect).sort((a, b) => stats.get(a)!.lastAt - stats.get(b)!.lastAt);
  return [...unseen, ...wrong, ...right].slice(0, size);
}

/** Mastery of a block: every exercise answered at least once and ≥ 85 % right over the last 20 answers. */
export const MASTERY_WINDOW = 20;
export const MASTERY_SHARE = 0.85;

/** `recent`: the block's latest answers, newest first (correct = true). */
export function isMastered(count: number, answered: number, recent: readonly boolean[]): boolean {
  if (count === 0 || answered < count) return false;
  const window = recent.slice(0, MASTERY_WINDOW);
  if (window.length < Math.min(MASTERY_WINDOW, count)) return false;
  return window.filter(Boolean).length / window.length >= MASTERY_SHARE;
}

/** Diagnostic: two exercises per block, the first and the one in the middle. */
export const diagnosticPicks = (count: number): number[] => (count < 2 ? [0] : [0, Math.floor(count / 2)]);

/** Part test («Контрольная части»): 20 mixed exercises from all blocks of a part; ≥ 85 % passes the part. */
export const PART_TEST_SIZE = 20;
export const PART_TEST_PASS = 0.85;

/**
 * Exercises for a part test: blocks take turns (so every block is represented), each turn a random exercise not
 * picked yet. `counts[b]` = number of exercises of block b; returns [block, exercise] index pairs.
 */
export function pickPartTest(counts: readonly number[], random: () => number = Math.random, size = PART_TEST_SIZE): [number, number][] {
  const left = counts.map((n) => Array.from({ length: n }, (_, i) => i));
  const picked: [number, number][] = [];
  const total = counts.reduce((a, b) => a + b, 0);
  for (let turn = 0; picked.length < Math.min(size, total); turn++) {
    const b = turn % counts.length;
    const pool = left[b]!;
    if (!pool.length) continue;
    const [i] = pool.splice(Math.floor(random() * pool.length), 1);
    picked.push([b, i!]);
  }
  return picked;
}

/** A part test result in per cent and whether it passes. */
export function partTestScore(correct: number, total: number): { score: number; passed: boolean } {
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { score, passed: total > 0 && correct / total >= PART_TEST_PASS };
}

/** Mastered blocks come back now and then so the rule isn't forgotten: after this many days without answers… */
export const REFRESH_AFTER_DAYS = 21;
/** …this many of their exercises (answered longest ago) join «Повторить ошибки». */
export const REFRESH_PER_BLOCK = 2;

export const needsRefresh = (mastered: boolean, lastAnswerAt: number | null, now: number) =>
  mastered && lastAnswerAt !== null && now - lastAnswerAt >= REFRESH_AFTER_DAYS * 86_400_000;

/** Search over blocks: case, stress marks and apostrophe form don't matter. */
export function matchesQuery(haystack: string, query: string): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/́/g, "").normalize("NFC").toLowerCase().replace(/['’ʼ‘`]/g, "’");
  const q = norm(query.trim());
  return q.length > 0 && norm(haystack).includes(q);
}

export type UkBlockStatus = "closed" | "known" | "open" | "mastered";
