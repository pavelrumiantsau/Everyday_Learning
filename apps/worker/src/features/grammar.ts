// Grammar lessons: rule of the day (weekday rotation), /rule, Mini App lesson API, exercises → cloze review cards.
import { exerciseCardId, grammarLangsForDay, inWindow, localClock, newCard, parseExerciseCardId, pickLesson, type Exercise, type Lang, type Lesson } from "@el/core";
import { Hono } from "hono";
import { LESSON_BY_ID, LESSONS, SCHEDULE } from "../content";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { getPrefs } from "../prefs";

const MORNING_WINDOW_MIN = 180; // same window as the morning lesson (daily.ts)
const FLAG: Record<string, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };

const langOfLesson = (l: Pick<Lesson, "id">) => l.id.slice(0, 2) as Lang;

// --- storage (migration 0004_grammar.sql) ---

async function doneLessonIds(d1: D1Database): Promise<Set<string>> {
  const { results } = await d1.prepare("SELECT lesson_id FROM grammar_done").all<{ lesson_id: string }>();
  return new Set(results.map((r) => r.lesson_id));
}

async function isDone(d1: D1Database, lessonId: string): Promise<boolean> {
  return (await d1.prepare("SELECT 1 AS x FROM grammar_done WHERE lesson_id = ?").bind(lessonId).first()) !== null;
}

async function dayLessonId(d1: D1Database, day: string): Promise<string | null> {
  return d1.prepare("SELECT lesson_id FROM grammar_day WHERE day = ?").bind(day).first<string>("lesson_id");
}

/** Atomically marks today's rule message as sent; true only for the caller that did it. */
async function claimSent(d1: D1Database, day: string, at: number): Promise<boolean> {
  const r = await d1.prepare("UPDATE grammar_day SET sent_at = ? WHERE day = ? AND sent_at IS NULL").bind(at, day).run();
  return r.meta.changes === 1;
}

/**
 * The rule of the local day. The first call of the day picks the next not-yet-done lesson of the weekday's
 * language and remembers it, so it stays the same all day (even after it's marked done).
 * `anyDay`: on a day without a rule (Sunday) still pick one (the next Lithuanian lesson) — used by /rule.
 */
export async function todayLesson(d1: D1Database, now: Date, anyDay = false): Promise<{ day: string; lesson: Lesson | null }> {
  const { day } = localClock(now, SCHEDULE.timezone);
  const stored = await dayLessonId(d1, day);
  if (stored) return { day, lesson: LESSON_BY_ID.get(stored) ?? null };
  const langs = grammarLangsForDay(day);
  if (!langs.length && anyDay) langs.push("lt");
  if (!langs.length) return { day, lesson: null };
  const done = await doneLessonIds(d1);
  const lesson = langs.map((lang) => pickLesson(LESSONS, lang, done, day)).find((l) => l) ?? null;
  if (!lesson) return { day, lesson: null };
  await d1.prepare("INSERT OR IGNORE INTO grammar_day (day, lesson_id) VALUES (?, ?)").bind(day, lesson.id).run();
  const id = await dayLessonId(d1, day); // another request may have picked first
  return { day, lesson: (id && LESSON_BY_ID.get(id)) || lesson };
}

// --- bot ---

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mini App link that opens the grammar screen directly. */
function grammarUrl(webAppUrl: string): string {
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set("screen", "grammar");
    return url.toString();
  } catch {
    return webAppUrl;
  }
}

function sendRule(ctx: BotContext, lesson: Lesson) {
  const text = [
    `📘 <b>Правило дня: ${escapeHtml(lesson.title)}</b>`,
    `${FLAG[langOfLesson(lesson)]} ${lesson.cefr} · ${lesson.exercises.length} упражнений · ~5 мин`,
  ].join("\n");
  return ctx.tg.sendMessage(ctx.ownerId, text, { text: "📘 Открыть правило", url: grammarUrl(ctx.webAppUrl) });
}

async function ruleCommand(ctx: BotContext) {
  const { day, lesson } = await todayLesson(ctx.env.DB, ctx.now, true);
  if (!lesson) return ctx.tg.sendMessage(ctx.ownerId, "📘 Все правила пройдены — новые придут со следующей партией контента.");
  await claimSent(ctx.env.DB, day, ctx.now.getTime()); // counts as today's rule message: the morning one won't come again
  return sendRule(ctx, lesson);
}

async function onTick(ctx: BotContext): Promise<string | void> {
  const { hhmm } = localClock(ctx.now, SCHEDULE.timezone);
  if (!inWindow(hhmm, (await getPrefs(ctx.db)).morning, MORNING_WINDOW_MIN)) return; // the learner's morning time (⚙️)
  const { day, lesson } = await todayLesson(ctx.env.DB, ctx.now);
  if (!lesson || !(await claimSent(ctx.env.DB, day, ctx.now.getTime()))) return;
  await sendRule(ctx, lesson);
  return lesson.id;
}

// --- review queue: exercise cards ---

export interface ClozeQueueCard {
  cardId: string;
  kind: "cloze";
  lang: Lang;
  lessonId: string;
  lessonTitle: string;
  exercise: Exercise;
}

/** Resolves an exercise card ("lt-g-0001:cloze2") for the review queue; null if it isn't one or no longer exists. */
export function grammarQueueCard(cardId: string): ClozeQueueCard | null {
  const ref = parseExerciseCardId(cardId);
  const lesson = ref && LESSON_BY_ID.get(ref.lessonId);
  const exercise = lesson?.exercises[ref!.index];
  if (!lesson || !exercise) return null;
  return { cardId, kind: "cloze", lang: langOfLesson(lesson), lessonId: lesson.id, lessonTitle: lesson.title, exercise };
}

// --- Mini App API ---

const api = new Hono<{ Bindings: Env }>();

api.get("/grammar/today", async (c) => {
  const { day, lesson } = await todayLesson(c.env.DB, new Date());
  return c.json({ day, lesson, done: lesson ? await isDone(c.env.DB, lesson.id) : false });
});

api.get("/grammar/lessons/:id", async (c) => {
  const lesson = LESSON_BY_ID.get(c.req.param("id"));
  if (!lesson) return c.json({ error: "unknown lesson" }, 404);
  return c.json({ lesson, done: await isDone(c.env.DB, lesson.id) });
});

/**
 * Placement «Грамматика»: the language's not-yet-done lessons in order, each with 2 exercises (first and last).
 * Both right → the Mini App offers to mark the lesson done without cards (`{ cards: false }` below).
 */
api.get("/grammar/diagnostic", async (c) => {
  const lang = c.req.query("lang") ?? "lt";
  const done = await doneLessonIds(c.env.DB);
  const lessons = LESSONS.filter((l) => langOfLesson(l) === lang && !done.has(l.id))
    .sort((a, b) => a.order - b.order)
    .map((l) => ({ id: l.id, title: l.title, cefr: l.cefr, exercises: [l.exercises[0]!, l.exercises.at(-1)!] }));
  return c.json({ lessons });
});

api.post("/grammar/lessons/:id/done", async (c) => {
  const lesson = LESSON_BY_ID.get(c.req.param("id"));
  if (!lesson) return c.json({ error: "unknown lesson" }, 404);
  // Already known (placement diagnostic): { cards: false } marks it done without adding its exercises to reviews.
  const body = await c.req.json<{ cards?: boolean }>().catch(() => ({}) as { cards?: boolean });
  const db = new Db(c.env.DB);
  const now = new Date();
  const at = now.getTime();
  const existing = await db.cardIds();
  const cardIds = lesson.exercises.map((_, i) => exerciseCardId(lesson.id, i));
  const fresh = body.cards === false ? [] : cardIds.filter((id) => !existing.has(id));
  await db.batch([
    c.env.DB.prepare("INSERT OR IGNORE INTO grammar_done (lesson_id, done_at) VALUES (?, ?)").bind(lesson.id, at),
    // Exercises come back in normal reviews, starting now.
    ...fresh.map((id) => db.insertCard(id, lesson.id, langOfLesson(lesson), newCard(now), at)),
  ]);
  return c.json({ done: true, cards: cardIds, created: fresh.length });
});

export const grammar: Feature = {
  id: "grammar",
  commands: [{ name: "rule", description: "Правило дня", run: (c) => ruleCommand(c) }],
  api,
  onTick,
};
