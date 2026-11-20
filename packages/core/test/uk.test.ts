import { describe, expect, it } from "vitest";
import {
  checkUk,
  diagnosticPicks,
  isMastered,
  matchesQuery,
  needsRefresh,
  PART_TEST_SIZE,
  parseUkExerciseId,
  partTestScore,
  pickPartTest,
  pickSession,
  tokens,
  UkBlock,
  ukExerciseId,
  ukPartOf,
  vowelPositions,
  type ExerciseStat,
} from "../src";

const judge = (i: number) => ({ type: "judge", text: `Речення ${i}.`, correct: true, explain: "пояснення" });
const block = (over: object = {}) => ({
  id: "uk-b-0410",
  part: 4,
  order: 10,
  title: "Звательный падеж",
  source: "§4.10",
  level: "B2",
  rule: "Обращение всегда в звательном падеже.",
  examples: [{ text: "Олено, ти вдома?" }, { text: "Пане професоре!" }, { text: "Друзі!" }],
  exercises: Array.from({ length: 20 }, (_, i) => judge(i)),
  ...over,
});
const issues = (b: object) => {
  const r = UkBlock.safeParse(b);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("Ukrainian blocks: schema", () => {
  it("accepts a valid block", () => expect(issues(block())).toEqual([]));

  it("id, part and order must agree", () => {
    expect(issues(block({ part: 5 }))).toContain("uk-b-0410 belongs to part 4");
    expect(issues(block({ order: 3 }))).toContain("uk-b-0410 has order 10");
  });

  it("needs 20–40 exercises, no exercise twice", () => {
    expect(issues(block({ exercises: [judge(1)] })).length).toBeGreaterThan(0);
    expect(issues(block({ exercises: [...Array.from({ length: 19 }, (_, i) => judge(i)), judge(0)] }))).toContain("the same exercise twice");
  });

  const withExercise = (e: object) => block({ exercises: [...Array.from({ length: 19 }, (_, i) => judge(i)), e] });

  it("checks every exercise type", () => {
    expect(issues(withExercise({ type: "cloze", text: "___, зайди!", answer: "Іване", explain: "II скл." }))).toEqual([]);
    expect(issues(withExercise({ type: "cloze", text: "Без пропуску.", answer: "Іване", explain: "II скл." }))).toContain("cloze text needs exactly one ___");
    expect(issues(withExercise({ type: "choice", text: "Брат ___ школі.", options: ["у", "в"], answer: 2, explain: "между согласными" }))).toContain(
      "answer must be an index into options",
    );
    expect(issues(withExercise({ type: "spot", text: "Ми приймали участь.", wrong: "брали", answer: "брали", explain: "брати участь" }))).toContain(
      "wrong must be exactly one word of the text",
    );
    expect(issues(withExercise({ type: "fix", text: "Дякую вас.", answer: "Дякую вас.", explain: "дякувати кому" }))).toContain("fix answer must differ from the text");
    expect(issues(withExercise({ type: "judge", text: "Брат в школі.", correct: false, explain: "у" }))).toContain("a wrong sentence needs fix, a right one none");
    expect(issues(withExercise({ type: "stress", word: "кропива", answer: 4, explain: "кропива́" }))).toContain("answer is past the word's last vowel");
    expect(issues(withExercise({ type: "stress", word: "кропива́", answer: 3, explain: "кропива́" }))).toContain("the word must not show its stress");
  });

  it("rejects Russian-only letters in correct Ukrainian answers, not in sentences with a mistake", () => {
    expect(issues(withExercise({ type: "cloze", text: "Это ___.", answer: "так", explain: "э" }))).toContain("a Ukrainian answer must not contain ы, э, ъ or ё");
    expect(issues(withExercise({ type: "fix", text: "Ну і шо ти скажеш?", answer: "Ну то й що ти скажеш?", explain: "суржик" }))).toEqual([]);
    expect(issues(withExercise({ type: "judge", text: "Всьо равно.", correct: false, fix: "Все одно.", explain: "суржик" }))).toEqual([]);
  });

  it("table rows must have as many cells as the head", () => {
    expect(issues(block({ tables: [{ head: ["a", "b"], rows: [["1"]] }] }))).toContain("row has 1 cells, head 2");
  });
});

describe("Ukrainian blocks: ids and helpers", () => {
  it("exercise ids round-trip", () => {
    expect(ukExerciseId("uk-b-0410", 0)).toBe("uk-b-0410:x1");
    expect(parseUkExerciseId("uk-b-0410:x12")).toEqual({ blockId: "uk-b-0410", index: 11 });
    expect(parseUkExerciseId("lt-g-0001:cloze1")).toBeNull();
    expect(ukPartOf("uk-b-1201")).toBe(12);
  });

  it("finds vowels (й is not one)", () => {
    expect(vowelPositions("кропива")).toEqual([2, 4, 6]);
    expect(vowelPositions("легкий")).toEqual([1, 4]);
    expect(vowelPositions("п'ятнадцять")).toEqual([2, 5, 8]);
  });

  it("splits a sentence into tappable words", () => {
    expect(tokens("Ми приймали участь, правда?").map((t) => t.word)).toEqual(["Ми", "приймали", "участь", "правда"]);
    expect(tokens("«Він в’їхав».")[1]).toEqual({ shown: "в’їхав».", word: "в’їхав" });
  });
});

describe("checkUk", () => {
  it("ignores case, punctuation, spaces, apostrophe form and stress marks", () => {
    expect(checkUk("  пане  директоре ", ["пане директоре"])).toBe(true);
    expect(checkUk("Можна поставити запитання", ["Можна поставити запитання?"])).toBe(true);
    expect(checkUk("п'ять", ["п’ять"])).toBe(true);
    expect(checkUk("пʼять", ["п’ять"])).toBe(true);
    expect(checkUk("кропива́", ["кропива"])).toBe(true);
  });

  it("one letter matters: и/й, і/ї, hyphen", () => {
    expect(checkUk("мои", ["мої"])).toBe(false);
    expect(checkUk("краи", ["край"])).toBe(false);
    expect(checkUk("будь хто", ["будь-хто"])).toBe(false);
    expect(checkUk("", ["так"])).toBe(false);
  });
});

describe("practice sessions and mastery", () => {
  const stat = (lastCorrect: boolean, lastAt: number): ExerciseStat => ({ answers: 1, lastCorrect, lastAt });

  it("unseen first, then wrong ones, then the oldest right ones", () => {
    const stats = new Map([
      [0, stat(true, 5)],
      [1, stat(false, 9)],
      [2, stat(true, 1)],
      [4, stat(false, 3)],
    ]);
    expect(pickSession(6, stats, 10)).toEqual([3, 5, 4, 1, 2, 0]);
    expect(pickSession(6, stats, 3)).toEqual([3, 5, 4]);
  });

  it("mastered: everything answered and ≥ 85 % of the last 20 right", () => {
    const right = (n: number) => Array.from({ length: n }, () => true);
    expect(isMastered(25, 25, right(20))).toBe(true);
    expect(isMastered(25, 24, right(20))).toBe(false);
    expect(isMastered(25, 25, [false, false, false, ...right(17)])).toBe(true); // 17/20 = 85 %
    expect(isMastered(25, 25, [false, false, false, false, ...right(16)])).toBe(false);
    expect(isMastered(25, 25, right(10))).toBe(false); // fewer than 20 answers
  });

  it("diagnostic: the first and the middle exercise", () => {
    expect(diagnosticPicks(24)).toEqual([0, 12]);
    expect(diagnosticPicks(1)).toEqual([0]);
  });
});

describe("part tests, refresh, search", () => {
  it("part test: blocks take turns, no exercise twice, at most the size", () => {
    const picks = pickPartTest([25, 30, 22], () => 0.5);
    expect(picks).toHaveLength(PART_TEST_SIZE);
    expect(picks.slice(0, 3).map(([b]) => b)).toEqual([0, 1, 2]);
    expect(new Set(picks.map(([b, i]) => `${b}:${i}`)).size).toBe(picks.length);
    expect(picks.filter(([b]) => b === 0)).toHaveLength(7);
    expect(pickPartTest([2, 3], Math.random)).toHaveLength(5); // fewer exercises than the size
  });

  it("part test score: ≥ 85 % passes", () => {
    expect(partTestScore(17, 20)).toEqual({ score: 85, passed: true });
    expect(partTestScore(16, 20)).toEqual({ score: 80, passed: false });
    expect(partTestScore(0, 0)).toEqual({ score: 0, passed: false });
  });

  it("mastered blocks come back after 21 days without answers", () => {
    const day = 86_400_000;
    expect(needsRefresh(true, 0, 21 * day)).toBe(true);
    expect(needsRefresh(true, 0, 20 * day)).toBe(false);
    expect(needsRefresh(false, 0, 30 * day)).toBe(false);
    expect(needsRefresh(true, null, 30 * day)).toBe(false);
  });

  it("search ignores case, stress marks and apostrophe form", () => {
    expect(matchesQuery("Звательный падеж (кличний відмінок)", "КЛИЧНИЙ")).toBe(true);
    expect(matchesQuery("кропива́", "кропива")).toBe(true);
    expect(matchesQuery("п’ять", "п'ять")).toBe(true);
    expect(matchesQuery("будь-хто", " ")).toBe(false);
  });
});
