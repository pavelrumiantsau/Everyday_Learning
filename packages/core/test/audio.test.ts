import { describe, expect, it } from "vitest";
import { audioPath, audioTexts, Item, lessonAudioId, lessonAudioTexts, spokenExample, spokenWord } from "../src";

const verb = Item.parse({
  id: "lt-w-0017", type: "word", cefr: "B1", text: "priimti", stress: "priim̃ti", pos: "verb",
  forms: { pres: "priima", past: "priėmė" }, meaning: { ru: "принимать" },
  examples: [{ text: "Jis priėmė sprendimą.", translation: "Он принял решение.", source: "generated" }],
});
const noun = Item.parse({ id: "lt-w-0002", type: "word", cefr: "B1", text: "priežastis", pos: "noun", gen: "priežasties", meaning: { ru: "причина" } });
const phrase = Item.parse({ id: "es-p-0001", type: "phrase", cefr: "A1", text: "¡Hola! ¿Qué tal?", meaning: { en: "Hi!" } });

describe("audio", () => {
  it("speaks the three principal forms of a verb, without stress marks", () => {
    expect(spokenWord(verb)).toBe("priimti, priima, priėmė");
  });
  it("speaks a noun with its genitive", () => {
    expect(spokenWord(noun)).toBe("priežastis, priežasties");
  });
  it("speaks other items as written", () => {
    expect(spokenWord(phrase)).toBe("¡Hola! ¿Qué tal?");
  });
  it("uses the first example, if there is one", () => {
    expect(spokenExample(verb)).toBe("Jis priėmė sprendimą.");
    expect(audioTexts(noun)).toEqual({ id: "lt-w-0002", word: "priežastis, priežasties" });
    expect(audioTexts(verb).ex).toBe("Jis priėmė sprendimą.");
  });
  it("builds file paths per language", () => {
    expect(audioPath("lt-w-0017", "word")).toBe("/audio/lt/lt-w-0017.mp3");
    expect(audioPath("es-p-0001", "ex")).toBe("/audio/es/es-p-0001-ex.mp3");
  });
});

describe("lesson audio", () => {
  it("speaks examples and exercise sentences with the blank filled in", () => {
    const lesson = { id: "fr-g-0004", examples: [{ text: "J'aime l'eau." }], exercises: [{ text: "___ai faim.", answer: "J'" }] };
    expect(lessonAudioTexts(lesson)).toEqual([
      { id: "fr-g-0004-e1", word: "J'aime l'eau." },
      { id: "fr-g-0004-x1", word: "J'ai faim." },
    ]);
    expect(audioPath(lessonAudioId("fr-g-0004", "x", 0), "word")).toBe("/audio/fr/fr-g-0004-x1.mp3");
  });
});
