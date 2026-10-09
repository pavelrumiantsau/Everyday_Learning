import { describe, expect, it } from "vitest";
import { Listening, listeningSpeech } from "../src";

const item = (over: object = {}) => ({
  id: "lt-l-0001",
  kind: "dialogue",
  cefr: "A1",
  track: "foundation",
  title: "Kavinėje",
  situation: "Кафе. Посетительница делает заказ.",
  lines: [{ speaker: "A", text: "Laba diena!" }, { speaker: "B", text: "Labas." }],
  questions: [0, 1, 2].map(() => ({ q: "Kas?", options: ["Taip", "Ne"], answer: 1 })),
  ...over,
});

describe("listening schema", () => {
  it("accepts a valid item", () => {
    expect(Listening.parse(item()).id).toBe("lt-l-0001");
  });
  it("needs exactly three questions", () => {
    expect(() => Listening.parse(item({ questions: [] }))).toThrow();
  });
  it("rejects an answer outside the options", () => {
    expect(() => Listening.parse(item({ questions: [0, 1, 2].map(() => ({ q: "Kas?", options: ["Taip", "Ne"], answer: 2 })) }))).toThrow(/answer/);
  });
  it("is foundation only", () => {
    expect(() => Listening.parse(item({ track: "main" }))).toThrow();
  });
  it("speaks the lines one after another", () => {
    expect(listeningSpeech(Listening.parse(item()))).toBe("Laba diena! Labas.");
  });
});
