import { describe, expect, it } from "vitest";
import { buildQuiz, inWindow, Item, localClock, pickNewItems, reviewQuiz, reviewCard, newCard, formatNewItem } from "../src";

const lt = (n: number, ru: string) =>
  Item.parse({ id: `lt-w-${String(n).padStart(4, "0")}`, type: "word", cefr: "A2", text: `žodis${n}`, meaning: { ru } });
const es = Item.parse({ id: "es-p-0001", type: "phrase", cefr: "A1", text: "¿Qué tal?", meaning: { en: "How are you?" } });

describe("schema", () => {
  it("requires the explanation language for each target language", () => {
    expect(() => Item.parse({ id: "lt-w-0001", type: "word", cefr: "A2", text: "laikas", meaning: { en: "time" } })).toThrow(/meaning.ru/);
    expect(() => Item.parse({ id: "es-p-0002", type: "phrase", cefr: "A1", text: "Hola", meaning: { ru: "привет" } })).toThrow(/meaning.en/);
  });
  it("checks that the id letter matches the type", () => {
    expect(() => Item.parse({ id: "lt-p-0001", type: "word", cefr: "A2", text: "laikas", meaning: { ru: "время" } })).toThrow(/id letter/);
  });
});

describe("time", () => {
  it("converts to the local day and clock", () => {
    // 2026-09-28 04:50 UTC = 07:50 in Vilnius (UTC+3, summer time)
    expect(localClock(new Date("2026-09-28T04:50:00Z"), "Europe/Vilnius")).toEqual({ day: "2026-09-28", hhmm: "07:50" });
    // just before midnight UTC is already the next day in Vilnius
    expect(localClock(new Date("2026-09-28T22:30:00Z"), "Europe/Vilnius").day).toBe("2026-09-29");
  });
  it("matches a time window", () => {
    expect(inWindow("07:50", "07:50", 180)).toBe(true);
    expect(inWindow("10:49", "07:50", 180)).toBe(true);
    expect(inWindow("10:50", "07:50", 180)).toBe(false);
    expect(inWindow("07:49", "07:50", 180)).toBe(false);
  });
});

describe("planner", () => {
  it("picks unseen items per language in file order", () => {
    const items = [lt(1, "а"), lt(2, "б"), lt(3, "в"), es];
    const picked = pickNewItems(items, new Set(["lt-w-0001"]), { lt: 1, es: 5 });
    expect(picked.map((i) => i.id)).toEqual(["lt-w-0002", "es-p-0001"]);
  });
});

describe("quiz", () => {
  it("has the right answer, distinct options, and only same-language distractors", () => {
    const pool = [lt(1, "время"), lt(2, "работа"), lt(3, "часто"), lt(4, "иногда"), lt(5, "встреча"), es];
    const q = buildQuiz(pool[0]!, pool, () => 0.42);
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options[q.correctIndex]).toBe("время");
    expect(q.options).not.toContain("How are you?");
  });
  it("works with a small pool", () => {
    const q = buildQuiz(lt(1, "время"), [lt(1, "время"), lt(2, "работа")]);
    expect(q.options.sort()).toEqual(["время", "работа"]);
  });
});

describe("srs", () => {
  it("schedules a correct answer later than a wrong one, and accepts JSON round-tripped cards", () => {
    const now = new Date("2026-10-01T08:00:00Z");
    const card = JSON.parse(JSON.stringify(newCard(now)));
    const good = reviewQuiz(card, now, true);
    const again = reviewQuiz(card, now, false);
    expect(good.due.getTime()).toBeGreaterThan(again.due.getTime());
    expect(good.reps).toBe(1);
  });
});

describe("reviewCard", () => {
  it("orders intervals Again < Hard < Good < Easy", () => {
    const now = new Date("2026-10-01T08:00:00Z");
    const card = reviewQuiz(newCard(now), now, true); // one earlier correct answer
    const later = new Date("2026-10-05T08:00:00Z");
    const due = ([1, 2, 3, 4] as const).map((r) => reviewCard(card, later, r).due.getTime());
    expect(due).toEqual([...due].sort((a, b) => a - b));
    expect(new Set(due).size).toBe(4);
  });
});

describe("principal forms", () => {
  it("are required for Lithuanian verbs and shown as a triple", () => {
    const base = { id: "lt-w-0100", type: "word", cefr: "B1", text: "priimti", pos: "verb", meaning: { ru: "принять" } };
    expect(() => Item.parse(base)).toThrow(/forms/);
    const item = Item.parse({ ...base, forms: { pres: "priima", past: "priėmė" } });
    expect(formatNewItem(item)).toContain("priimti, priima, priėmė");
  });
});

describe("nouns", () => {
  it("need a genitive in Lithuanian and show dictionary form + readable labels", () => {
    const base = { id: "lt-w-0101", type: "word", cefr: "B1", text: "priežastis", pos: "noun", gender: "f", meaning: { ru: "причина" } };
    expect(() => Item.parse(base)).toThrow(/gen/);
    const item = Item.parse({ ...base, gen: "priežasties" });
    expect(formatNewItem(item)).toContain("priežastis, priežasties");
    expect(formatNewItem(item)).toContain("сущ., ж. р.");
  });
  it("Spanish nouns need no genitive and get English labels", () => {
    const item = Item.parse({ id: "es-w-0101", type: "word", cefr: "A1", text: "casa", pos: "noun", gender: "f", meaning: { en: "house" } });
    expect(formatNewItem(item)).toContain("noun, fem.");
  });
});

describe("format", () => {
  it("escapes HTML", () => {
    const item = Item.parse({ id: "lt-w-0009", type: "word", cefr: "A2", text: "a<b", meaning: { ru: "x&y" } });
    expect(formatNewItem(item)).toContain("a&lt;b");
    expect(formatNewItem(item)).toContain("x&amp;y");
  });
});
