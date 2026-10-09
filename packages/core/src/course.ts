// Lithuanian foundation course map (docs/EXTENSION-PLAN.md §6.3–§6.7): units in order, each pointing to existing content
// ids (words, phrases, lessons, texts) plus a can-do list. Only learners with `lt.course: foundation` follow it;
// the original plan never sees it. File: content/lt/course/foundation.yaml (validated by scripts/build-content.ts).
import { z } from "zod";

export const COURSE_STAGES = ["sounds", "A1", "A2", "exam"] as const;
export type CourseStage = (typeof COURSE_STAGES)[number];

export const CourseUnit = z.object({
  /** s01… sounds, u01–u24 units, e01… exam stage. Stable: progress and checks are stored by it. */
  id: z.string().regex(/^(s|u|e)\d{2}$/, "unit id must look like u01"),
  stage: z.enum(COURSE_STAGES),
  /** Russian, shown in the Mini App. */
  title: z.string().trim().min(1).max(80),
  /** Number of the official A2 topic (1 identity … 12 services), if the unit has one. */
  topic: z.number().int().min(1).max(12).optional(),
  words: z.array(z.string().regex(/^lt-w-\d{4}$/)).default([]),
  phrases: z.array(z.string().regex(/^lt-p-\d{4}$/)).default([]),
  lessons: z.array(z.string().regex(/^lt-g-\d{4}$/)).default([]),
  texts: z.array(z.string().regex(/^lt-r-\d{4}$/)).default([]),
  /** Writing tasks (lt-t-…) and speaking situations (lt-s-…), content/lt/tasks. Optional for completing the unit. */
  tasks: z.array(z.string().regex(/^lt-(t|s)-\d{4}$/)).default([]),
  /** Listening dialogues and announcements (lt-l-…), content/lt/listening. Optional for completing the unit. */
  listening: z.array(z.string().regex(/^lt-l-\d{4}$/)).default([]),
  /** Mock exams (lt-x-…), content/lt/exams. Passing one at its level completes the unit. */
  exams: z.array(z.string().regex(/^lt-x-\d{4}$/)).default([]),
  /** «Я могу…» statements in Russian. */
  can_do: z.array(z.string().trim().min(3).max(120)).max(8).default([]),
});
export type CourseUnit = z.infer<typeof CourseUnit>;

export const Course = z
  .object({
    id: z.literal("lt-foundation"),
    units: z.array(CourseUnit).min(1),
  })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    const where = new Map<string, string>();
    c.units.forEach((u, i) => {
      if (ids.has(u.id)) ctx.addIssue({ code: "custom", path: ["units", i, "id"], message: `duplicate unit ${u.id}` });
      ids.add(u.id);
      for (const id of [...u.words, ...u.phrases, ...u.lessons, ...u.texts, ...u.tasks, ...u.listening, ...u.exams]) {
        const other = where.get(id);
        if (other) ctx.addIssue({ code: "custom", path: ["units", i], message: `${id} is in ${other} and ${u.id}` });
        where.set(id, u.id);
      }
    });
  });
export type Course = z.infer<typeof Course>;

/** Words and phrases of the course in unit order. */
export const courseItemIds = (c: Course): string[] => c.units.flatMap((u) => [...u.phrases, ...u.words]);

/** Items reordered for a foundation learner: course words and phrases in unit order first, then everything else as before. */
export function courseItemOrder<T extends { id: string }>(items: readonly T[], c: Course): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const first = courseItemIds(c).flatMap((id) => byId.get(id) ?? []);
  const inCourse = new Set(first.map((i) => i.id));
  return [...first, ...items.filter((i) => !inCourse.has(i.id))];
}

/**
 * Lessons with the `order` a foundation learner follows: the course's Lithuanian lessons in unit order (1, 2, …), then the
 * other Lithuanian lessons in their own order after them. Spanish and French lessons keep theirs.
 */
export function courseLessonOrder<L extends { id: string; order: number }>(lessons: readonly L[], c: Course): L[] {
  const pos = new Map(c.units.flatMap((u) => u.lessons).map((id, i) => [id, i + 1]));
  return lessons.map((l) => {
    if (!l.id.startsWith("lt-")) return l;
    const p = pos.get(l.id);
    return { ...l, order: p ?? 10_000 + l.order };
  });
}

export interface UnitState {
  /** Words and phrases with a card (being learned or learned). */
  introduced: ReadonlySet<string>;
  /** Words and phrases whose meaning card is past the learning steps (FSRS Review state). */
  learned: ReadonlySet<string>;
  lessonsDone: ReadonlySet<string>;
  textsRead: ReadonlySet<string>;
  /** Best unit-check score in % by unit id. */
  checks: ReadonlyMap<string, number>;
  /** Mock exams passed at their level (A1 exam with A1, A2 exam with A2). */
  examsPassed: ReadonlySet<string>;
}

export interface UnitProgress {
  id: string;
  words: { total: number; learned: number; introduced: number };
  lessons: { total: number; done: number };
  texts: { total: number; read: number };
  exams: { total: number; passed: number };
  check: number | null;
  /** 0–100: learned words, done lessons, read texts and passed mock exams together. */
  percent: number;
  /** Everything learned, done and read, or a unit check ≥ PASS_PERCENT. */
  complete: boolean;
}

export const UNIT_CHECK_SIZE = 10;
export const PASS_PERCENT = 80;

export function unitProgress(u: CourseUnit, s: UnitState): UnitProgress {
  const items = [...u.phrases, ...u.words];
  const words = { total: items.length, learned: items.filter((id) => s.learned.has(id)).length, introduced: items.filter((id) => s.introduced.has(id)).length };
  const lessons = { total: u.lessons.length, done: u.lessons.filter((id) => s.lessonsDone.has(id)).length };
  const texts = { total: u.texts.length, read: u.texts.filter((id) => s.textsRead.has(id)).length };
  const exams = { total: u.exams.length, passed: u.exams.filter((id) => s.examsPassed.has(id)).length };
  const parts = words.total + lessons.total + texts.total + exams.total;
  const doneParts = words.learned + lessons.done + texts.read + exams.passed;
  const percent = parts ? Math.round((doneParts / parts) * 100) : 0;
  const check = s.checks.get(u.id) ?? null;
  return { id: u.id, words, lessons, texts, exams, check, percent, complete: (parts > 0 && doneParts === parts) || (check ?? 0) >= PASS_PERCENT };
}

const hasContent = (p: UnitProgress) => p.words.total + p.lessons.total + p.texts.total + p.exams.total > 0;

/** The unit to work on: the first one with content that isn't complete (units still without content are skipped). */
export function currentUnit(progress: readonly UnitProgress[]): string | null {
  return (progress.find((p) => hasContent(p) && !p.complete) ?? [...progress].reverse().find(hasContent))?.id ?? null;
}
