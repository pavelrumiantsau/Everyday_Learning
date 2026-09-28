// Streak with freezes, computed from the daily activity history (so it can always be recomputed).
// A day is "done" with at least `minAnswers` answers. Every 7 done days in a row earn a freeze (max 2);
// a missed day uses a freeze if there is one, otherwise the streak restarts. Paused days are neutral.

export interface DayActivity {
  day: string; // YYYY-MM-DD, local
  reviews: number;
  paused: boolean;
}

export interface StreakResult {
  streak: number; // consecutive done days (today counts once done)
  freezes: number; // available now
  todayDone: boolean;
  best: number;
}

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function computeStreak(history: DayActivity[], today: string, minAnswers: number): StreakResult {
  const byDay = new Map(history.map((h) => [h.day, h]));
  const first = history.map((h) => h.day).filter((d) => d <= today).sort()[0];
  let streak = 0, freezes = 0, best = 0, sinceFreeze = 0;
  const todayDone = (byDay.get(today)?.reviews ?? 0) >= minAnswers;
  if (!first) return { streak: 0, freezes: 0, todayDone, best: 0 };

  for (let day = first; day < today; day = addDays(day, 1)) {
    const a = byDay.get(day);
    if (a && a.reviews >= minAnswers) {
      streak++;
      sinceFreeze++;
      if (sinceFreeze === FREEZE_EVERY) {
        freezes = Math.min(MAX_FREEZES, freezes + 1);
        sinceFreeze = 0;
      }
    } else if (a?.paused) {
      // neutral
    } else if (freezes > 0) {
      freezes--; // a freeze covers the missed day; the streak survives
    } else {
      streak = 0;
      sinceFreeze = 0;
    }
    best = Math.max(best, streak);
  }
  if (todayDone) streak++;
  return { streak, freezes, todayDone, best: Math.max(best, streak) };
}
