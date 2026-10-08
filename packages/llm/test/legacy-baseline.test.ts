// The owner's AI tutor and feedback must keep the same learner profiles (docs/EXTENSION-PLAN.md §4).
// legacy/learner.ts is a frozen copy as of 2026-10-08; once profiles are built from a learner profile, the legacy profile
// must still produce exactly these.
import { describe, expect, it } from "vitest";
import { PROFILES } from "../src/learner";
import * as legacy from "./legacy/learner";

describe("legacy baseline: AI learner profiles", () => {
  it("match the frozen profiles", () => {
    expect(PROFILES).toEqual(legacy.PROFILES);
  });
});
