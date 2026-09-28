import { describe, expect, it } from "vitest";
import { sameIgnoringPunctuation, wordDiff } from "../src";

describe("wordDiff", () => {
  it("marks only the changed words", () => {
    const d = wordDiff("Aš eina į parduotuvę", "Aš einu į parduotuvę");
    expect(d.a.filter((t) => t.changed).map((t) => t.text)).toEqual(["eina"]);
    expect(d.b.filter((t) => t.changed).map((t) => t.text)).toEqual(["einu"]);
  });
  it("handles inserted and removed words", () => {
    const d = wordDiff("neturiu laiką", "aš neturiu laiko");
    expect(d.b.filter((t) => t.changed).map((t) => t.text)).toEqual(["aš", "laiko"]);
    expect(d.a.filter((t) => t.changed).map((t) => t.text)).toEqual(["laiką"]);
  });
});

describe("sameIgnoringPunctuation", () => {
  it("ignores case, spaces and punctuation but not letters", () => {
    expect(sameIgnoringPunctuation("Labas, rytas!", "labas rytas")).toBe(true);
    expect(sameIgnoringPunctuation("laiką", "laiko")).toBe(false);
  });
});
