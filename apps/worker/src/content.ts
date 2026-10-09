import type { Item, Lesson, Milestones, ReadingText, Schedule, Sources } from "@el/core";
import contentJson from "./generated/content.json";
import grammarJson from "./generated/grammar.json";
import scheduleJson from "./generated/schedule.json";

// Validated at build time by scripts/build-content.ts.
export const ITEMS = contentJson as unknown as Item[];
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const SCHEDULE = scheduleJson as unknown as Schedule;
import milestonesJson from "./generated/milestones.json";
export const MILESTONES = milestonesJson as unknown as Milestones;
export const LESSONS = grammarJson as unknown as Lesson[];
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
import readingJson from "./generated/reading.json";
export const TEXTS = readingJson as unknown as ReadingText[];
export const TEXT_BY_ID = new Map(TEXTS.map((t) => [t.id, t]));
import sourcesJson from "./generated/sources.json";
export const SOURCES = (sourcesJson as unknown as Sources).sources;
import courseJson from "./generated/course.json";
import type { Course } from "@el/core";
/** Lithuanian foundation course map (content/lt/course/foundation.yaml), or null before it exists. */
export const COURSE = courseJson as unknown as Course | null;
import tasksJson from "./generated/tasks.json";
import type { Task } from "@el/core";
/** Writing tasks and speaking situations of the foundation course (content/lt/tasks). */
export const TASKS = tasksJson as unknown as Task[];
export const TASK_BY_ID = new Map(TASKS.map((t) => [t.id, t]));
import listeningJson from "./generated/listening.json";
import type { Listening } from "@el/core";
/** Listening dialogues and announcements of the foundation course (content/lt/listening). */
export const LISTENING = listeningJson as unknown as Listening[];
export const LISTENING_BY_ID = new Map(LISTENING.map((l) => [l.id, l]));
