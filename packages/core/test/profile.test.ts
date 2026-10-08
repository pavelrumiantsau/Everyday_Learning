import { describe, expect, it } from "vitest";
import { visibleTo, firstReadingLevel, grammarLangsForDay, isReadingDay, newPerDayFor, Profile, readingLangForDay, ruleLangsForDay, weekPlan } from "../src";

const ltOnly = (over: object = {}) =>
  Profile.parse({ version: 1, timezone: "Europe/Vilnius", main: "lt", pace: "normal", languages: { lt: { course: "foundation", level: "A0" } }, created: "2026-11-02", ...over });

describe("profile schema", () => {
  it("accepts Lithuanian only", () => {
    expect(ltOnly().main).toBe("lt");
  });
  it("needs the main language among the chosen ones", () => {
    expect(() => ltOnly({ main: "es" })).toThrow(/main language/);
  });
  it("needs at least one language", () => {
    expect(() => ltOnly({ languages: {} })).toThrow(/at least one/);
  });
  it("keeps courses to the languages that have them", () => {
    expect(() => ltOnly({ languages: { lt: { course: "standard", level: "A0" } } })).toThrow(/foundation or continuing/);
    expect(() => ltOnly({ main: "es", languages: { es: { course: "foundation", level: "A0" } } })).toThrow(/only Lithuanian/);
    expect(() => ltOnly({ main: "es", languages: { es: { course: "standard", level: "A0", exam: { level: "A2" } } } })).toThrow(/exam/);
  });
  it("rejects unknown time zones and bad dates", () => {
    expect(() => ltOnly({ timezone: "Mars/Olympus" })).toThrow(/time zone/);
    expect(() => ltOnly({ languages: { lt: { course: "foundation", level: "A0", exam: { level: "A2", date: "June" } } } })).toThrow();
  });
});

describe("pace", () => {
  it("gives the main language the larger share and unchosen languages nothing", () => {
    expect(newPerDayFor(ltOnly())).toEqual({ lt: 8, es: 0, fr: 0 });
    const two = ltOnly({ pace: "intensive", languages: { lt: { course: "foundation", level: "A0" }, es: { course: "standard", level: "A1" } } });
    expect(newPerDayFor(two)).toEqual({ lt: 15, es: 5, fr: 0 });
  });
});

describe("week plan", () => {
  it("Lithuanian only, normal: rules Mon/Wed/Fri, reading Thu", () => {
    const w = weekPlan(ltOnly());
    expect(w.map((d) => d.grammar.join("+"))).toEqual(["", "lt", "", "lt", "", "lt", ""]);
    expect(w.map((d) => d.reading)).toEqual([null, null, null, null, "lt", null, null]);
  });
  it("light: Mon/Thu rules, reading Sat; intensive: Mon–Fri, reading Sat", () => {
    expect(weekPlan(ltOnly({ pace: "light" })).map((d) => d.grammar.length)).toEqual([0, 1, 0, 0, 1, 0, 0]);
    expect(weekPlan(ltOnly({ pace: "light" }))[6]!.reading).toBe("lt");
    expect(weekPlan(ltOnly({ pace: "intensive" })).map((d) => d.grammar.length)).toEqual([0, 1, 1, 1, 1, 1, 0]);
    expect(weekPlan(ltOnly({ pace: "intensive" }))[6]!.reading).toBe("lt");
  });
  it("alternates main and other languages; others fall back to the main one", () => {
    const p = ltOnly({ pace: "intensive", languages: { lt: { course: "foundation", level: "A0" }, es: { course: "standard", level: "A0" }, fr: { course: "standard", level: "A0" } } });
    expect(weekPlan(p).slice(1, 6).map((d) => d.grammar.join("+"))).toEqual(["lt", "es+lt", "lt", "fr+lt", "lt"]);
  });
  it("without a profile: exactly today's rotation and reading day", () => {
    for (const day of ["2026-10-05", "2026-10-08", "2026-10-10", "2027-04-02", "2027-04-09", "2027-04-10"]) {
      expect(ruleLangsForDay(day, null)).toEqual(grammarLangsForDay(day));
      expect(readingLangForDay(day, null)).toBe(isReadingDay(day) ? "lt" : null);
    }
  });
  it("first reading text is one step above the level", () => {
    expect(firstReadingLevel("lt", ltOnly())).toBe("A1");
    expect(firstReadingLevel("lt", null)).toBe("B2");
    expect(firstReadingLevel("es", ltOnly())).toBe("A1");
  });
});

describe("foundation content", () => {
  const items = [{ id: "a" }, { id: "b", track: "foundation" as const }];
  it("is never visible to the original plan or to other courses", () => {
    expect(visibleTo(items, null).map((i) => i.id)).toEqual(["a"]);
    expect(visibleTo(items, ltOnly({ languages: { lt: { course: "continuing", level: "B1" } } })).map((i) => i.id)).toEqual(["a"]);
  });
  it("is visible on the Lithuanian foundation course", () => {
    expect(visibleTo(items, ltOnly()).map((i) => i.id)).toEqual(["a", "b"]);
  });
});
