import { describe, expect, it } from "vitest";
import { choicePoints, Exam, examResult, interactionPoint, partLevel, speakingLevel, EXAM_PASS } from "../src";

// NŠA rules (docs/EXTENSION-PLAN.md §6.1).
describe("part levels", () => {
  it("reading/writing: A1 from 13 of 22, A2 from 17 of 28 with A1", () => {
    expect(partLevel({ A1: 12, A2: 28 }, EXAM_PASS.rw, "A2")).toBeNull();
    expect(partLevel({ A1: 13, A2: 16 }, EXAM_PASS.rw, "A2")).toBe("A1");
    expect(partLevel({ A1: 13, A2: 17 }, EXAM_PASS.rw, "A2")).toBe("A2");
  });
  it("listening: 6 of 10 for each level", () => {
    expect(partLevel({ A1: 5, A2: 10 }, EXAM_PASS.listening, "A2")).toBeNull();
    expect(partLevel({ A1: 6, A2: 6 }, EXAM_PASS.listening, "A2")).toBe("A2");
  });
  it("an A1 exam gives at most A1", () => {
    expect(partLevel({ A1: 22, A2: 0 }, EXAM_PASS.rw, "A1")).toBe("A1");
  });
});

describe("speaking", () => {
  it("NŠA's examples: 2 + 2 + 1 + 1 → A1, 3 + 2 + 0 + 1 → A2", () => {
    expect(speakingLevel([2, 2, 1], 1, "A2")).toBe("A1");
    expect(speakingLevel([3, 2, 0], 1, "A2")).toBe("A2");
  });
  it("A1 needs 5 points with at least 2 in two situations", () => {
    expect(speakingLevel([3, 1, 1], 0, "A2")).toBeNull();
    expect(speakingLevel([2, 2, 0], 0, "A2")).toBeNull();
    expect(speakingLevel([2, 2, 1], 0, "A2")).toBe("A1");
  });
  it("A2 needs 6 points", () => {
    expect(speakingLevel([3, 2, 0], 0, "A2")).toBe("A1");
  });
  it("the examiner's point: every situation scored at least 1", () => {
    expect(interactionPoint([1, 1, 1])).toBe(1);
    expect(interactionPoint([3, 3, 0])).toBe(0);
  });
});

describe("exam result", () => {
  it("is the lowest level of the three parts", () => {
    const r = examResult("A2", { rw: { A1: 20, A2: 20 }, listening: { A1: 8, A2: 7 }, speaking: [3, 2, 2] });
    expect(r).toMatchObject({ rw: "A2", listening: "A2", speaking: "A2", overall: "A2", complete: true });
    expect(examResult("A2", { rw: { A1: 20, A2: 10 }, listening: { A1: 8, A2: 7 }, speaking: [3, 2, 2] }).overall).toBe("A1");
    expect(examResult("A2", { rw: { A1: 20, A2: 20 }, listening: { A1: 5, A2: 7 }, speaking: [3, 2, 2] }).overall).toBeNull();
  });
  it("has no overall result until all parts are done", () => {
    expect(examResult("A1", { rw: { A1: 22, A2: 0 }, listening: null, speaking: null })).toMatchObject({ rw: "A1", overall: null, complete: false });
  });
});

describe("choice points", () => {
  it("counts correct answers per level", () => {
    const tasks = [
      { cefr: "A1" as const, questions: [{ q: "", options: ["a", "b"], answer: 0 }, { q: "", options: ["a", "b"], answer: 1 }] },
      { cefr: "A2" as const, questions: [{ q: "", options: ["a", "b"], answer: 1 }] },
    ];
    expect(choicePoints(tasks, [[0, 0], [1]])).toEqual({ A1: 1, A2: 1 });
    expect(choicePoints(tasks, [])).toEqual({ A1: 0, A2: 0 });
  });
});

describe("exam schema", () => {
  const q = (n: number) => Array.from({ length: n }, () => ({ q: "Kas?", options: ["Taip", "Ne"], answer: 0 }));
  const gaps = (n: number) => ({ kind: "gaps", cefr: "A1", instruction: "Выберите слово.", text: Array.from({ length: n }, (_, i) => `Žodis (${i + 1}) čia.`).join(" "), questions: q(n) });
  const a1 = {
    id: "lt-x-0001", level: "A1", track: "foundation", title: "Пробный экзамен A1",
    rw: [
      { kind: "reading", cefr: "A1", instruction: "Прочитайте текст.", text: "Labas, aš esu Tomas. Gyvenu Vilniuje.", questions: q(5) },
      { kind: "reading", cefr: "A1", instruction: "Прочитайте текст.", text: "Labas, aš esu Tomas. Gyvenu Vilniuje.", questions: q(6) },
      gaps(5),
      { kind: "writing", cefr: "A1", task: "lt-t-0101" },
    ],
    listening: [{ cefr: "A1", instruction: "Послушайте.", lines: [{ speaker: "A", text: "Labas." }], questions: q(5) }, { cefr: "A1", instruction: "Послушайте.", lines: [{ speaker: "A", text: "Labas." }], questions: q(5) }],
    speaking: ["lt-s-0101", "lt-s-0102", "lt-s-0103"],
  };
  it("accepts an A1 exam worth 22 + 10 points", () => {
    expect(Exam.parse(a1).id).toBe("lt-x-0001");
  });
  it("checks the points of each level", () => {
    expect(() => Exam.parse({ ...a1, rw: a1.rw.slice(1) })).toThrow(/worth 17 points, need 22/);
  });
  it("checks the gaps in the text", () => {
    expect(() => Exam.parse({ ...a1, rw: [a1.rw[0], a1.rw[1], { ...gaps(5), text: "Be tarpų čia, tik žodžiai." }, a1.rw[3]] })).toThrow(/gaps/);
  });
});
