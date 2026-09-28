import { describe, expect, it } from "vitest";
import { computeStreak, type DayActivity } from "../src";

const days = (start: string, pattern: string): DayActivity[] =>
  [...pattern].map((c, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { day: d.toISOString().slice(0, 10), reviews: c === "x" ? 20 : c === "." ? 3 : 0, paused: c === "p" };
  });

describe("computeStreak", () => {
  it("counts consecutive done days; today counts once done", () => {
    const h = days("2026-10-01", "xxx");
    expect(computeStreak(h, "2026-10-03", 15)).toMatchObject({ streak: 3, todayDone: true });
    expect(computeStreak(h.slice(0, 2), "2026-10-03", 15)).toMatchObject({ streak: 2, todayDone: false });
  });
  it("breaks on a missed day without freezes", () => {
    expect(computeStreak(days("2026-10-01", "xx.x"), "2026-10-04", 15).streak).toBe(1);
  });
  it("a freeze earned after 7 days covers one missed day", () => {
    const r = computeStreak(days("2026-10-01", "xxxxxxx-xx"), "2026-10-10", 15);
    expect(r).toMatchObject({ streak: 9, freezes: 0 });
  });
  it("paused days are neutral", () => {
    expect(computeStreak(days("2026-10-01", "xxppx"), "2026-10-05", 15).streak).toBe(3);
  });
  it("freezes are capped", () => {
    const r = computeStreak(days("2026-10-01", "x".repeat(30)), "2026-10-31", 15);
    expect(r.freezes).toBe(2);
    expect(r.best).toBe(30);
  });
});
