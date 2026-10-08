// Learner profile (docs/EXTENSION-PLAN.md §5): what a colleague's copy learns and how fast, chosen in the setup wizard.
// The owner's deployment has no stored profile and keeps today's plan: every function here returns exactly the old
// behaviour for `null` (= legacy), which test/legacy-baseline.test.ts checks against frozen copies.
import { z } from "zod";
import { grammarLangsForDay } from "./grammar";
import { DEFAULT_READING_LEVEL, isReadingDay, type ReadingLevel } from "./reading";
import { LANGS, type Lang } from "./schema";

export const PACES = {
  light: { main: 5, other: 3, lessonsPerWeek: 2, minutes: 15 },
  normal: { main: 8, other: 4, lessonsPerWeek: 3, minutes: 25 },
  intensive: { main: 15, other: 5, lessonsPerWeek: 5, minutes: 45 },
} as const;
export type Pace = keyof typeof PACES;

export const LEVELS = ["A0", "A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

/** foundation = Lithuanian A0 → A2-exam course; continuing = today's B1+ path; standard = ES/FR content as it is. */
export const COURSES = ["foundation", "continuing", "standard"] as const;
export type Course = (typeof COURSES)[number];

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const LanguagePlan = z.object({
  course: z.enum(COURSES),
  level: z.enum(LEVELS),
  /** Optional goal: the A2 state exam (Lithuanian), with a date if the learner has one. */
  exam: z.object({ level: z.literal("A2"), date: Day.optional() }).optional(),
});
export type LanguagePlan = z.infer<typeof LanguagePlan>;

export const Profile = z
  .object({
    version: z.literal(1),
    timezone: z.string().min(1).max(64),
    main: z.enum(LANGS),
    pace: z.enum(["light", "normal", "intensive"]),
    languages: z.partialRecord(z.enum(LANGS), LanguagePlan),
    created: Day,
  })
  .superRefine((p, ctx) => {
    const langs = Object.keys(p.languages) as Lang[];
    if (!langs.length) ctx.addIssue({ code: "custom", path: ["languages"], message: "choose at least one language" });
    if (!p.languages[p.main]) ctx.addIssue({ code: "custom", path: ["main"], message: "the main language must be one of the chosen languages" });
    for (const l of langs) {
      const plan = p.languages[l]!;
      if (plan.course === "foundation" && l !== "lt") ctx.addIssue({ code: "custom", path: ["languages", l], message: "only Lithuanian has the foundation course" });
      if (plan.course === "continuing" && l !== "lt") ctx.addIssue({ code: "custom", path: ["languages", l], message: "only Lithuanian has the continuing course" });
      if (plan.course === "standard" && l === "lt") ctx.addIssue({ code: "custom", path: ["languages", l], message: "Lithuanian is foundation or continuing" });
      if (plan.exam && l !== "lt") ctx.addIssue({ code: "custom", path: ["languages", l, "exam"], message: "the exam goal is for Lithuanian" });
    }
    try {
      new Intl.DateTimeFormat("en", { timeZone: p.timezone });
    } catch {
      ctx.addIssue({ code: "custom", path: ["timezone"], message: "unknown time zone" });
    }
  });
export type Profile = z.infer<typeof Profile>;

/** What the wizard sends: the profile plus the daily rhythm that lives in the existing prefs. */
export const SetupAnswers = z.object({
  profile: Profile,
  morning: Hhmm,
  evening: Hhmm,
  min_day_answers: z.number().int().min(1).max(200),
});
export type SetupAnswers = z.infer<typeof SetupAnswers>;

export const chosenLangs = (p: Profile): Lang[] => LANGS.filter((l) => p.languages[l]);

/** New words per day for each language from the pace: the main language gets the larger share, others less, unchosen 0. */
export function newPerDayFor(p: Profile): Record<Lang, number> {
  const pace = PACES[p.pace];
  return Object.fromEntries(LANGS.map((l) => [l, !p.languages[l] ? 0 : l === p.main ? pace.main : pace.other])) as Record<Lang, number>;
}

/** Weekdays (0 = Sunday) with a new rule, by lessons per week. */
const LESSON_DAYS: Record<number, number[]> = { 2: [1, 4], 3: [1, 3, 5], 5: [1, 2, 3, 4, 5] };
/** Reading day: Thursday when it is free, else Saturday. */
const readingWeekday = (lessonDays: number[]) => (lessonDays.includes(4) ? 6 : 4);

export interface WeekDay {
  /** Candidate languages for the rule of the day, in order of preference (first with a lesson left wins). */
  grammar: Lang[];
  /** Language of the reading text of the day, or null. */
  reading: Lang | null;
}

/**
 * The weekly plan of a profile (index 0 = Sunday). Lesson days alternate main / other languages, so the main language
 * gets most of them; a language without lessons left falls back to the main one.
 */
export function weekPlan(p: Profile): WeekDay[] {
  const langs = chosenLangs(p);
  const others = langs.filter((l) => l !== p.main);
  const lessonDays = LESSON_DAYS[PACES[p.pace].lessonsPerWeek]!;
  const week: WeekDay[] = Array.from({ length: 7 }, () => ({ grammar: [], reading: null }));
  let other = 0;
  lessonDays.forEach((weekday, i) => {
    const lang = i % 2 === 1 && others.length ? others[other++ % others.length]! : p.main;
    week[weekday]!.grammar = lang === p.main ? [lang] : [lang, p.main];
  });
  week[readingWeekday(lessonDays)]!.reading = p.main;
  return week;
}

const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** Rule-of-the-day languages for a local day: the profile's week plan, or today's fixed rotation without a profile. */
export function ruleLangsForDay(day: string, p: Profile | null): Lang[] {
  return p ? weekPlan(p)[weekday(day)]!.grammar : grammarLangsForDay(day);
}

/** The language of the reading text on this day, or null. Without a profile: Thursday = Lithuanian. */
export function readingLangForDay(day: string, p: Profile | null): Lang | null {
  if (!p) return isReadingDay(day) ? "lt" : null;
  return weekPlan(p)[weekday(day)]!.reading;
}

/** First reading level when nothing has been rated yet. */
export function firstReadingLevel(lang: Lang, p: Profile | null): ReadingLevel {
  const plan = p?.languages[lang];
  if (!plan) return DEFAULT_READING_LEVEL[lang];
  const steps: Record<Level, ReadingLevel> = { A0: "A1", A1: "A2", A2: "B1", B1: "B2", B2: "C1" };
  return steps[plan.level];
}

/** French grammar waits for FR_START only in the owner's original plan; a copy that chose French starts it now. */
export const holdsFrenchGrammar = (p: Profile | null) => p === null;

/**
 * Whether content marked `track: foundation` (the Lithuanian A0 → A2 course) is visible: only to a profile on that course.
 * The original plan (null) never sees it; everything without a track is visible to everyone, as before.
 */
export function visibleTo<T extends { track?: "foundation" }>(items: readonly T[], p: Profile | null): T[] {
  const foundation = p?.languages.lt?.course === "foundation";
  return foundation ? [...items] : items.filter((i) => i.track !== "foundation");
}
