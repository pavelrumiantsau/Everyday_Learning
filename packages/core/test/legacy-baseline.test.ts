/// <reference types="node" />
// The owner's bot must behave exactly as before the colleagues extension (docs/EXTENSION-PLAN.md §4).
// test/legacy/*.ts are frozen copies of the scheduling logic as of 2026-10-08. Once the code becomes profile-driven, these
// tests call it with the legacy profile and must still get the same answers as the frozen copies.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  adjustNewPerDay,
  DEFAULT_READING_LEVEL,
  grammarLangsForDay,
  isReadingDay,
  nextReadingLevel,
  pickLesson,
  pickNewItems,
  pickText,
  verdict,
  type Item,
  type WeekSummary,
} from "../src";
import * as legacyGrammar from "./legacy/grammar";
import * as legacyPlanner from "./legacy/planner";
import * as legacyReading from "./legacy/reading";
import * as legacyWeekly from "./legacy/weekly";

const LANGS = ["lt", "es", "fr"] as const;
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
const RATINGS = ["easy", "ok", "hard"] as const;

/** Every local day from `from` to `to` inclusive, as "YYYY-MM-DD". */
function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
const ALL_DAYS = days("2026-10-01", "2028-12-31");

// Built content (pnpm build → apps/worker/src/generated). CI builds before testing; locally run `pnpm build` once.
const GENERATED = fileURLToPath(new URL("../../../apps/worker/src/generated/", import.meta.url));
const built = existsSync(`${GENERATED}content.json`);
const load = <T>(name: string): T => JSON.parse(readFileSync(`${GENERATED}${name}.json`, "utf8")) as T;
if (!built && process.env.CI) throw new Error("legacy-baseline: run `pnpm build` before the tests (generated content missing)");

describe("legacy baseline: weekly rhythm", () => {
  it("rule-of-the-day languages match for every day 2026-10-01 … 2028-12-31", () => {
    for (const day of ALL_DAYS) expect(grammarLangsForDay(day), day).toEqual(legacyGrammar.grammarLangsForDay(day));
  });
  it("reading days match", () => {
    for (const day of ALL_DAYS) expect(isReadingDay(day), day).toBe(legacyReading.isReadingDay(day));
  });
});

describe("legacy baseline: reading level", () => {
  it("default levels match", () => {
    expect(DEFAULT_READING_LEVEL).toEqual(legacyReading.DEFAULT_READING_LEVEL);
  });
  it("next level after every rating matches", () => {
    for (const lang of LANGS) {
      expect(nextReadingLevel(null, lang)).toBe(legacyReading.nextReadingLevel(null, lang));
      for (const cefr of LEVELS) {
        for (const rating of RATINGS) {
          expect(nextReadingLevel({ cefr, rating }, lang), `${lang} ${cefr} ${rating}`).toBe(
            legacyReading.nextReadingLevel({ cefr, rating }, lang),
          );
        }
      }
    }
  });
});

describe("legacy baseline: weekly report", () => {
  const weeks: WeekSummary[] = [];
  for (const daysDone of [0, 4, 5, 6, 7])
    for (const answers of [0, 40, 200])
      for (const retention of [null, 70, 85, 95])
        for (const dueBacklog of [0, 59, 100, 151])
          for (const lt of [0, 179, 180]) weeks.push({ daysDone, answers, retention, dueBacklog, inputMinutes: { lt, es: 30 } });
  it("verdict matches", () => {
    for (const w of weeks) expect(verdict(w)).toBe(legacyWeekly.verdict(w));
  });
  it("new-words adjustment matches", () => {
    for (const current of [{ lt: 10, es: 5, fr: 0 }, { lt: 2, es: 20 }, { lt: 7 }] as Record<string, number>[])
      for (const w of weeks) expect(adjustNewPerDay(current, w)).toEqual(legacyWeekly.adjustNewPerDay(current, w));
  });
});

describe.skipIf(!built)("legacy baseline: content pickers (built content)", () => {
  it("new words come in the same order, portion by portion", () => {
    const items = load<Item[]>("content");
    const introduced = new Set<string>();
    for (let round = 0; round < 400; round++) {
      const perLang = { lt: 10, es: 5, fr: round % 2 ? 4 : 0 };
      const now = pickNewItems(items, introduced, perLang).map((i) => i.id);
      expect(now, `round ${round}`).toEqual(legacyPlanner.pickNewItems(items, introduced, perLang).map((i) => i.id));
      if (!now.length) break;
      for (const id of now) introduced.add(id);
    }
  });

  it("grammar lessons come in the same order (before and after FR_START, and without a day)", () => {
    const lessons = load<{ id: string; order: number }[]>("grammar");
    for (const lang of LANGS) {
      for (const day of ["2026-10-08", "2027-04-01", undefined]) {
        const done = new Set<string>();
        for (;;) {
          const now = pickLesson(lessons, lang, done, day);
          expect(now?.id ?? null, `${lang} ${day} after ${done.size}`).toBe(legacyGrammar.pickLesson(lessons, lang, done, day)?.id ?? null);
          if (!now) break;
          done.add(now.id);
        }
      }
    }
  });

  it("reading texts come in the same order for every language and level", () => {
    const texts = load<{ id: string; cefr?: string }[]>("reading");
    for (const lang of [...LANGS, undefined]) {
      for (const level of [...LEVELS, undefined]) {
        const read = new Set<string>();
        for (;;) {
          const now = pickText(texts, read, lang, level);
          expect(now?.id ?? null, `${lang} ${level} after ${read.size}`).toBe(legacyReading.pickText(texts, read, lang, level)?.id ?? null);
          if (!now) break;
          read.add(now.id);
        }
      }
    }
  });
});
