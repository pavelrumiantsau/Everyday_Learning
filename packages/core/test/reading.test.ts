import { describe, expect, it } from "vitest";
import { isReadingDay, learnerItemId, nextReadingLevel, ownTextId, paragraphs, parseLearnerItemId, parseOwnTextId, pickText, ReadingText, sentenceAt, tokenize, wordsOf } from "../src";

describe("tokenize", () => {
  it("keeps Lithuanian/Spanish letters in words and round-trips the text", () => {
    const s = "Aš išsinuomojau butą – ¿dónde está? Vis dėlto…";
    const t = tokenize(s);
    expect(t.map((x) => x.text).join("")).toBe(s);
    expect(wordsOf(s)).toEqual(["Aš", "išsinuomojau", "butą", "dónde", "está", "Vis", "dėlto"]);
    expect(t.find((x) => x.text === "butą")!.start).toBe(s.indexOf("butą"));
  });
});

describe("paragraphs and sentences", () => {
  it("splits on blank lines and finds the sentence around a word", () => {
    const text = "Pirmas sakinys.\nTęsinys.\n\nAntra pastraipa. Joje du sakiniai!";
    expect(paragraphs(text)).toEqual(["Pirmas sakinys. Tęsinys.", "Antra pastraipa. Joje du sakiniai!"]);
    const p = paragraphs(text)[1]!;
    expect(sentenceAt(p, p.indexOf("du"))).toBe("Joje du sakiniai!");
  });
});

describe("text choice", () => {
  const texts = [{ id: "es-r-0001" }, { id: "lt-r-0002" }, { id: "lt-r-0001" }];
  it("gives the next unread text, Lithuanian first", () => {
    expect(pickText(texts, new Set())!.id).toBe("lt-r-0001");
    expect(pickText(texts, new Set(["lt-r-0001", "lt-r-0002"]))!.id).toBe("es-r-0001");
    expect(pickText(texts, new Set(["lt-r-0001", "lt-r-0002"]), "lt")).toBeNull();
  });
  it("Thursday is reading day; learner item ids round-trip", () => {
    expect(isReadingDay("2026-10-01")).toBe(true); // a Thursday
    expect(isReadingDay("2026-10-02")).toBe(false);
    expect(parseLearnerItemId(learnerItemId("lt", 42))).toEqual({ lang: "lt", n: 42 });
    expect(parseLearnerItemId("lt-w-0001")).toBeNull();
  });
});

describe("reading level", () => {
  it("starts Lithuanian one level above B1 and follows the learner's rating", () => {
    expect(nextReadingLevel(null, "lt")).toBe("B2");
    expect(nextReadingLevel({ cefr: "B1", rating: "easy" }, "lt")).toBe("B2");
    expect(nextReadingLevel({ cefr: "B2", rating: "ok" }, "lt")).toBe("B2");
    expect(nextReadingLevel({ cefr: "B2", rating: "hard" }, "lt")).toBe("B1");
    expect(nextReadingLevel({ cefr: "C1", rating: "easy" }, "lt")).toBe("C1");
  });
  it("prefers texts of the target level, then the nearest (harder first)", () => {
    const texts = [
      { id: "lt-r-0001", cefr: "B1" },
      { id: "lt-r-0002", cefr: "B1" },
      { id: "lt-r-0019", cefr: "B2" },
      { id: "lt-r-0020", cefr: "C1" },
    ];
    expect(pickText(texts, new Set(), "lt", "B2")!.id).toBe("lt-r-0019");
    expect(pickText(texts, new Set(["lt-r-0019"]), "lt", "B2")!.id).toBe("lt-r-0020");
    expect(pickText(texts, new Set(), "lt", "B1")!.id).toBe("lt-r-0001");
    expect(pickText(texts, new Set(), "lt")!.id).toBe("lt-r-0001");
  });
  it("own text ids round-trip", () => {
    expect(ownTextId(7)).toBe("u-r-000007");
    expect(parseOwnTextId("u-r-000007")).toBe(7);
    expect(parseOwnTextId("lt-r-0007")).toBeNull();
  });
});

describe("ReadingText schema", () => {
  const base = {
    id: "lt-r-0099",
    cefr: "A2",
    title: "Testas",
    topic: "тест",
    source: "generated",
    text: Array.from({ length: 70 }, () => "žodis").join(" ") + " butą.",
    questions: [0, 1, 2].map((i) => ({ q: `Klausimas ${i}?`, options: ["Taip", "Ne"], answer: 0 })),
  };
  it("accepts a valid text", () => {
    expect(ReadingText.safeParse({ ...base, glossary: [{ word: "butą", lemma: "butas", meaning: "квартира" }] }).success).toBe(true);
  });
  it("rejects glossary words not in the text, English glossary for Lithuanian, and bad answers", () => {
    expect(ReadingText.safeParse({ ...base, glossary: [{ word: "namas", lemma: "namas", meaning: "дом" }] }).success).toBe(false);
    expect(ReadingText.safeParse({ ...base, glossary: [{ word: "butą", lemma: "butas", meaning: "flat" }] }).success).toBe(false);
    expect(ReadingText.safeParse({ ...base, questions: [{ q: "?", options: ["a", "b"], answer: 5 }, ...base.questions.slice(1)] }).success).toBe(false);
  });
  it("enforces the length for the level", () => {
    expect(ReadingText.safeParse({ ...base, text: "Per trumpas tekstas." }).success).toBe(false);
  });
});

describe("foundation reading texts", () => {
  const text = (over: object) => ({
    id: "lt-r-0201", cefr: "A1", title: "Meniu", topic: "меню", source: "generated",
    text: "Kava du eurai. Arbata du eurai. Sriuba keturi eurai. Žuvis devyni eurai. Mėsa dešimt eurų. Pyragas trys eurai. Sultys trys eurai. Vanduo vienas euras. Ačiū!",
    questions: [0, 1, 2].map((i) => ({ q: `Klausimas ${i}?`, options: ["Taip", "Ne"], answer: 0 })),
    ...over,
  });
  it("may be short (25+ words) when they are foundation A1–A2 exam texts", () => {
    expect(ReadingText.parse(text({ track: "foundation", kind: "menu" })).kind).toBe("menu");
  });
  it("other texts keep the old minimum", () => {
    expect(() => ReadingText.parse(text({}))).toThrow(/60–150 words/);
  });
});
