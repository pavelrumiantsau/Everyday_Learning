// The owner's AI tutor and feedback must keep the same learner profiles (docs/EXTENSION-PLAN.md §4).
// legacy/learner.ts is a frozen copy as of 2026-10-08; once profiles are built from a learner profile, the legacy profile
// must still produce exactly these.
import { describe, expect, it } from "vitest";
import { learnerProfileFor, PROFILES } from "../src/learner";
import * as legacy from "./legacy/learner";

describe("legacy baseline: AI learner profiles", () => {
  it("match the frozen profiles", () => {
    expect(PROFILES).toEqual(legacy.PROFILES);
  });
});

describe("AI profiles for colleagues' copies", () => {
  it("are the original ones without a level", () => {
    for (const lang of ["lt", "es", "fr"] as const) expect(learnerProfileFor(lang, null)).toBe(PROFILES[lang]);
  });
  it("describe a native Russian speaker without Ukrainian or Belarusian, at the chosen level", () => {
    const a0 = learnerProfileFor("lt", "A0");
    expect(a0.level).toBe("A0 absolute beginner. Native Russian speaker");
    expect(a0.style).toMatch(/VERY simple.*in Russian/);
    expect(JSON.stringify(["A0", "A1", "A2", "B1", "B2"].map((l) => learnerProfileFor("lt", l as "A0")))).not.toMatch(/Ukrainian|Belarusian/);
    expect(learnerProfileFor("es", "A1").explainIn).toBe("English");
  });
});
