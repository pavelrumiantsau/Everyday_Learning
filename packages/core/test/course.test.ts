import { describe, expect, it } from "vitest";
import { checkAnswer, Course, courseItemOrder, courseLessonOrder, currentUnit, unitProgress, type UnitState } from "../src";

const course = (units: object[]) => Course.parse({ id: "lt-foundation", units });
const u1 = { id: "u01", stage: "A1", title: "Знакомство", words: ["lt-w-0003", "lt-w-0001"], phrases: ["lt-p-0009"], lessons: ["lt-g-0205"], texts: ["lt-r-0201"] };
const u2 = { id: "u02", stage: "A1", title: "Кафе", words: ["lt-w-0002"], lessons: ["lt-g-0201"] };
const state = (over: Partial<UnitState> = {}): UnitState => ({
  introduced: new Set(), learned: new Set(), lessonsDone: new Set(), textsRead: new Set(), checks: new Map(), ...over,
});

describe("course schema", () => {
  it("accepts units and fills defaults", () => {
    expect(course([u1, { id: "s01", stage: "sounds", title: "Алфавит" }]).units[1]!.words).toEqual([]);
  });
  it("rejects duplicate units and content in two units", () => {
    expect(() => course([u1, { ...u2, id: "u01" }])).toThrow(/duplicate unit/);
    expect(() => course([u1, { ...u2, words: ["lt-w-0001"] }])).toThrow(/lt-w-0001 is in u01 and u02/);
  });
  it("only takes Lithuanian ids of the right kind", () => {
    expect(() => course([{ ...u1, words: ["es-w-0001"] }])).toThrow();
    expect(() => course([{ ...u1, lessons: ["lt-w-0001"] }])).toThrow();
  });
});

describe("course order", () => {
  const c = course([u1, u2]);
  it("puts course words in unit order first, the rest after in file order", () => {
    const items = ["lt-w-0001", "lt-w-0002", "lt-w-0003", "lt-w-0004", "lt-p-0009", "es-w-0001"].map((id) => ({ id }));
    expect(courseItemOrder(items, c).map((i) => i.id)).toEqual(["lt-p-0009", "lt-w-0003", "lt-w-0001", "lt-w-0002", "lt-w-0004", "es-w-0001"]);
  });
  it("orders Lithuanian lessons by unit, other Lithuanian lessons after them, other languages unchanged", () => {
    const lessons = [{ id: "lt-g-0001", order: 1 }, { id: "lt-g-0201", order: 201 }, { id: "lt-g-0205", order: 205 }, { id: "es-g-0001", order: 1 }];
    expect(courseLessonOrder(lessons, c).map((l) => `${l.id}:${l.order}`)).toEqual(["lt-g-0001:10001", "lt-g-0201:2", "lt-g-0205:1", "es-g-0001:1"]);
  });
});

describe("unit progress", () => {
  const c = course([u1, u2]);
  it("counts learned words, done lessons and read texts", () => {
    const p = unitProgress(c.units[0]!, state({ learned: new Set(["lt-w-0001", "lt-p-0009"]), introduced: new Set(["lt-w-0001", "lt-p-0009", "lt-w-0003"]), lessonsDone: new Set(["lt-g-0205"]) }));
    expect(p.words).toEqual({ total: 3, learned: 2, introduced: 3 });
    expect(p.percent).toBe(60); // 2 words + 1 lesson of 5 parts
    expect(p.complete).toBe(false);
  });
  it("a passed unit check completes the unit; the current unit is the first incomplete one", () => {
    const passed = unitProgress(c.units[0]!, state({ checks: new Map([["u01", 80]]) }));
    expect(passed.complete).toBe(true);
    expect(currentUnit([passed, unitProgress(c.units[1]!, state())])).toBe("u02");
    expect(currentUnit([passed])).toBe("u01");
    const empty = unitProgress(Course.parse({ id: "lt-foundation", units: [{ id: "s01", stage: "sounds", title: "Звуки" }] }).units[0]!, state());
    expect(currentUnit([empty, unitProgress(c.units[1]!, state())])).toBe("u02"); // a unit without content yet is skipped
  });
});

describe("strict letters (exam practice)", () => {
  it("turns «almost» into «wrong»", () => {
    expect(checkAnswer("dirbciau", ["dirbčiau"])).toBe("almost");
    expect(checkAnswer("dirbciau", ["dirbčiau"], true)).toBe("wrong");
    expect(checkAnswer("Dirbčiau.", ["dirbčiau"], true)).toBe("correct");
  });
});
