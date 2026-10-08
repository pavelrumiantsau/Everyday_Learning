// FROZEN copy of packages/core/src/weekly.ts at f413d69 (2026-10-08) — the owner's behaviour before the colleagues extension.
// Do not edit: test/legacy-baseline.test.ts compares the live code (legacy profile) against it. See docs/EXTENSION-PLAN.md §4.
// Weekly verdict and automatic adjustment of new words per day (PLAN §3.7), as pure functions.

export interface WeekSummary {
  daysDone: number; // days with at least min answers (of 7)
  answers: number;
  retention: number | null; // % correct, null when no answers
  dueBacklog: number; // cards due right now
  inputMinutes: Record<string, number>; // per language
}

export type Verdict = "ahead" | "on_track" | "behind";

/** Lithuanian input target: 3 h/week (PLAN §10). */
export const LT_INPUT_TARGET_MIN = 180;

export function verdict(w: WeekSummary): Verdict {
  const lt = w.inputMinutes.lt ?? 0;
  if (w.daysDone >= 6 && lt >= LT_INPUT_TARGET_MIN) return "ahead";
  if (w.daysDone >= 5) return "on_track";
  return "behind";
}

/**
 * New words per day for next week. Fewer when reviews pile up or accuracy drops, more when it's easy.
 * Changes by at most 2 per language per week, stays within [min, max].
 */
export function adjustNewPerDay(
  current: Record<string, number>,
  w: WeekSummary,
  bounds = { min: 2, max: 20 },
): { next: Record<string, number>; reason: string | null } {
  let delta = 0;
  let reason: string | null = null;
  if (w.dueBacklog > 150) {
    delta = -2;
    reason = `накопилось ${w.dueBacklog} карточек к повторению`;
  } else if (w.retention !== null && w.retention < 80 && w.answers >= 50) {
    delta = -1;
    reason = `верных ответов ${w.retention}% (< 80%)`;
  } else if (w.retention !== null && w.retention >= 90 && w.daysDone >= 6 && w.dueBacklog < 60) {
    delta = 1;
    reason = `верных ответов ${w.retention}% и ${w.daysDone}/7 дней — можно больше`;
  }
  if (!delta) return { next: { ...current }, reason: null };
  const next = Object.fromEntries(
    Object.entries(current).map(([lang, n]) => [lang, n === 0 ? 0 : Math.min(bounds.max, Math.max(bounds.min, n + delta))]),
  );
  const changed = Object.keys(current).some((l) => next[l] !== current[l]);
  return { next, reason: changed ? reason : null };
}
