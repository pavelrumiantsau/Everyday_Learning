import { describe, expect, it } from "vitest";
import { checkAnswer, clozeParts, exerciseCardId, grammarLangForDay, grammarLangsForDay, Lesson, parseExerciseCardId, pickLesson } from "../src";

const ex = (over: object = {}) => ({ type: "cloze", text: "Aš ___ namie.", answer: "būsiu", hint: "būti", translation: "Я буду дома.", ...over });
const example = { text: "Rytoj eisiu į mokyklą.", translation: "Завтра я пойду в школу.", source: "tatoeba:1501577" };
const lesson = (over: object = {}) => ({
  id: "lt-g-0001",
  cefr: "B1",
  order: 1,
  title: "Будущее время",
  explanation: { ru: "Текст" },
  examples: [example, example, example],
  exercises: [ex(), ex(), ex(), ex()],
  ...over,
});

describe("grammar lesson schema", () => {
  it("accepts a valid lesson", () => {
    expect(Lesson.parse(lesson()).exercises).toHaveLength(4);
  });
  it("requires the explanation (and comparison) in the explanation language", () => {
    expect(() => Lesson.parse(lesson({ explanation: { en: "Text" } }))).toThrow(/explanation.ru/);
    expect(() => Lesson.parse(lesson({ comparison: { en: "Text" } }))).toThrow(/comparison/);
    expect(() => Lesson.parse(lesson({ id: "es-g-0001", explanation: { ru: "Текст" } }))).toThrow(/explanation.en/);
    expect(Lesson.parse(lesson({ id: "es-g-0001", explanation: { en: "Text" }, comparison: { en: "Like Russian" } })).id).toBe("es-g-0001");
  });
  it("checks the id format", () => {
    expect(() => Lesson.parse(lesson({ id: "lt-w-0001" }))).toThrow(/lt-g-0001/);
  });
  it("needs 3–5 examples and 4–8 exercises", () => {
    expect(() => Lesson.parse(lesson({ examples: [example, example] }))).toThrow();
    expect(() => Lesson.parse(lesson({ exercises: [ex(), ex(), ex()] }))).toThrow();
    expect(() => Lesson.parse(lesson({ exercises: Array.from({ length: 9 }, () => ex()) }))).toThrow();
  });
  it("rejects empty answers and cloze text without exactly one blank", () => {
    expect(() => Lesson.parse(lesson({ exercises: [ex({ answer: "  " }), ex(), ex(), ex()] }))).toThrow(/answer/);
    expect(() => Lesson.parse(lesson({ exercises: [ex({ text: "Aš būsiu namie." }), ex(), ex(), ex()] }))).toThrow(/___/);
    expect(() => Lesson.parse(lesson({ exercises: [ex({ text: "___ ir ___" }), ex(), ex(), ex()] }))).toThrow(/___/);
  });
  it("only accepts known exercise types", () => {
    expect(() => Lesson.parse(lesson({ exercises: [ex({ type: "essay" }), ex(), ex(), ex()] }))).toThrow();
  });
});

describe("weekday rotation", () => {
  it("follows PLAN §3.6: Mon LT, Tue ES, Wed LT, Thu none (reading), Fri ES, Sat LT, Sun none", () => {
    // 2026-09-28 is a Monday
    const week = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
    expect(week.map(grammarLangForDay)).toEqual(["lt", "es", "lt", null, "es", "fr", null]);
  });
  it("Saturday is French sounds (else LT) until 2027-04-01, then LT again", () => {
    expect(grammarLangsForDay("2026-10-03")).toEqual(["fr", "lt"]);
    expect(grammarLangsForDay("2027-03-27")).toEqual(["fr", "lt"]);
    expect(grammarLangsForDay("2027-04-03")).toEqual(["lt"]);
  });
  it("from April 2027 Friday alternates French and Spanish", () => {
    expect(grammarLangsForDay("2027-03-26")).toEqual(["es"]);
    const fridays = ["2027-04-02", "2027-04-09", "2027-04-16", "2027-04-23"].map(grammarLangsForDay);
    expect(fridays.filter((l) => l[0] === "fr")).toHaveLength(2);
    expect(fridays.filter((l) => l[0] === "es")).toHaveLength(2);
    expect(fridays.every((l) => l.at(-1) === "es")).toBe(true);
  });
  it("Thursday and Sunday have no rule", () => {
    expect(grammarLangsForDay("2026-10-01")).toEqual([]);
    expect(grammarLangsForDay("2026-10-04")).toEqual([]);
  });
});

describe("lesson choice", () => {
  const ls = [
    { id: "lt-g-0002", order: 2 },
    { id: "es-g-0001", order: 1 },
    { id: "lt-g-0001", order: 1 },
  ];
  it("picks the first not-done lesson of the language by order", () => {
    expect(pickLesson(ls, "lt", new Set())?.id).toBe("lt-g-0001");
    expect(pickLesson(ls, "lt", new Set(["lt-g-0001"]))?.id).toBe("lt-g-0002");
    expect(pickLesson(ls, "es", new Set())?.id).toBe("es-g-0001");
    expect(pickLesson(ls, "lt", new Set(["lt-g-0001", "lt-g-0002"]))).toBeNull();
  });
});

describe("cloze cards", () => {
  it("round-trips exercise card ids", () => {
    expect(exerciseCardId("lt-g-0003", 0)).toBe("lt-g-0003:cloze1");
    expect(parseExerciseCardId("lt-g-0003:cloze2")).toEqual({ lessonId: "lt-g-0003", index: 1 });
    expect(parseExerciseCardId("lt-w-0001:recog")).toBeNull();
  });
  it("splits a sentence at the blank", () => {
    expect(clozeParts("Aš ___ namie.")).toEqual(["Aš ", " namie."]);
  });
});

describe("answer check", () => {
  it("ignores case, punctuation and extra spaces", () => {
    expect(checkAnswer("  Dirbsiu ", ["dirbsiu"])).toBe("correct");
    expect(checkAnswer("Estás", ["estás"])).toBe("correct");
    expect(checkAnswer("naujaisiais.", ["Naujaisiais"])).toBe("correct");
    expect(checkAnswer("l’ami", ["l'ami"])).toBe("correct"); // iOS curly apostrophe
  });
  it("says 'almost' when only diacritics differ (Lithuanian and Spanish)", () => {
    expect(checkAnswer("dirbciau", ["dirbčiau"])).toBe("almost");
    expect(checkAnswer("zaliaji", ["žaliąjį"])).toBe("almost");
    expect(checkAnswer("esta", ["está"])).toBe("almost");
    expect(checkAnswer("aprendeis", ["aprendéis"])).toBe("almost");
  });
  it("accepts alternative answers and rejects wrong ones", () => {
    expect(checkAnswer("keliausim", ["keliausime", "keliausim"])).toBe("correct");
    expect(checkAnswer("dirbau", ["dirbdavau"])).toBe("wrong");
    expect(checkAnswer("", ["dirbdavau"])).toBe("wrong");
  });
  it("handles decomposed Unicode input (e.g. from some keyboards)", () => {
    expect(checkAnswer("dirbčiau", ["dirbčiau"])).toBe("correct");
  });
});
