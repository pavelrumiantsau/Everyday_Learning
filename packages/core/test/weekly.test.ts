import { describe, expect, it } from "vitest";
import { adjustNewPerDay, verdict, type WeekSummary } from "../src";

const week = (w: Partial<WeekSummary>): WeekSummary => ({ daysDone: 5, answers: 300, retention: 85, dueBacklog: 40, inputMinutes: {}, ...w });

describe("verdict", () => {
  it("is ahead with 6+ days and 3 h of Lithuanian input, behind under 5 days", () => {
    expect(verdict(week({ daysDone: 6, inputMinutes: { lt: 200 } }))).toBe("ahead");
    expect(verdict(week({ daysDone: 5 }))).toBe("on_track");
    expect(verdict(week({ daysDone: 3 }))).toBe("behind");
  });
});

describe("adjustNewPerDay", () => {
  const cur = { lt: 10, es: 5, fr: 0 };
  it("reduces by 2 when the backlog is large, never touching a language set to 0", () => {
    const r = adjustNewPerDay(cur, week({ dueBacklog: 200 }));
    expect(r.next).toEqual({ lt: 8, es: 3, fr: 0 });
    expect(r.reason).toContain("200");
  });
  it("reduces by 1 on low accuracy, increases by 1 when easy", () => {
    expect(adjustNewPerDay(cur, week({ retention: 70 })).next.lt).toBe(9);
    expect(adjustNewPerDay(cur, week({ retention: 93, daysDone: 7 })).next.lt).toBe(11);
  });
  it("keeps values within bounds and reports no change when nothing changes", () => {
    expect(adjustNewPerDay({ lt: 2 }, week({ dueBacklog: 500 }))).toEqual({ next: { lt: 2 }, reason: null });
    expect(adjustNewPerDay(cur, week({})).reason).toBeNull();
  });
});
