// Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.3): the Mini App's «Курс» screen. Only for learners on the
// foundation course of a personal copy; everyone else gets 404 (the original bot never sees the course).
//   GET  /api/course                     units with progress and the current unit
//   GET  /api/course/units/:id           one unit: words, lessons, texts with their state
//   POST /api/course/units/:id/check     {correct, total} → unit-check score (best is kept)
//   GET  /api/course/listening/:id       a listening dialogue or announcement (audio /audio/lt/<id>.mp3)
//   POST /api/course/units/:id/known     «Я это знаю»: words marked known (as in placement), lessons done without cards,
//                                        the unit counted as passed
import { currentUnit, PASS_PERCENT, UNIT_CHECK_SIZE, unitProgress, type CourseUnit, type UnitState } from "@el/core";
import { Hono } from "hono";
import { COURSE, EXAM_BY_ID, ITEM_BY_ID, LESSON_BY_ID, LISTENING_BY_ID, TASK_BY_ID, TEXT_BY_ID } from "../content";
import { Db } from "../db";
import type { Feature } from "../feature";
import { onFoundation } from "../profile";
import { savePlacement } from "./placement";
import { examsPassed } from "./exams";
import { bestScores } from "./tasks";

async function unitState(db: Db, d1: D1Database): Promise<UnitState> {
  const [introduced, learned, lessons, texts, checks, passed] = await Promise.all([
    db.introducedItemIds(),
    db.learnedItemIds(),
    d1.prepare("SELECT lesson_id FROM grammar_done").all<{ lesson_id: string }>(),
    d1.prepare("SELECT DISTINCT text_id FROM reading_done").all<{ text_id: string }>(),
    d1.prepare("SELECT unit_id, best FROM course_check").all<{ unit_id: string; best: number }>(),
    examsPassed(d1),
  ]);
  return {
    introduced,
    learned,
    lessonsDone: new Set(lessons.results.map((r) => r.lesson_id)),
    textsRead: new Set(texts.results.map((r) => r.text_id)),
    checks: new Map(checks.results.map((r) => [r.unit_id, r.best])),
    examsPassed: passed,
  };
}

const unitOf = (id: string): CourseUnit | undefined => COURSE?.units.find((u) => u.id === id);

const api = new Hono<{ Bindings: Env }>();

api.use("/course/*", async (c, next) => (onFoundation() ? next() : c.json({ error: "no course" }, 404)));
api.use("/course", async (c, next) => (onFoundation() ? next() : c.json({ error: "no course" }, 404)));

api.get("/course", async (c) => {
  const state = await unitState(new Db(c.env.DB), c.env.DB);
  const units = COURSE!.units.map((u) => ({ id: u.id, stage: u.stage, title: u.title, topic: u.topic ?? null, can_do: u.can_do, progress: unitProgress(u, state) }));
  return c.json({ units, current: currentUnit(units.map((u) => u.progress)), passPercent: PASS_PERCENT, checkSize: UNIT_CHECK_SIZE });
});

api.get("/course/units/:id", async (c) => {
  const u = unitOf(c.req.param("id"));
  if (!u) return c.json({ error: "unknown unit" }, 404);
  const state = await unitState(new Db(c.env.DB), c.env.DB);
  const words = [...u.phrases, ...u.words].flatMap((id) => {
    const it = ITEM_BY_ID.get(id);
    return it ? [{ id, text: it.text, stress: it.stress ?? null, meaning: it.meaning.ru ?? "", introduced: state.introduced.has(id), learned: state.learned.has(id) }] : [];
  });
  const lessons = u.lessons.map((id) => ({ id, title: LESSON_BY_ID.get(id)?.title ?? id, done: state.lessonsDone.has(id) }));
  const texts = u.texts.map((id) => ({ id, title: TEXT_BY_ID.get(id)?.title ?? id, read: state.textsRead.has(id) }));
  const best = await bestScores(c.env.DB);
  const tasks = u.tasks.flatMap((id) => {
    const t = TASK_BY_ID.get(id);
    return t ? [{ id, kind: t.kind, title: t.title, best: best.get(id) ?? null }] : [];
  });
  const listening = u.listening.flatMap((id) => {
    const l = LISTENING_BY_ID.get(id);
    return l ? [{ id, kind: l.kind, title: l.title }] : [];
  });
  const exams = u.exams.flatMap((id) => {
    const e = EXAM_BY_ID.get(id);
    return e ? [{ id, level: e.level, title: e.title, passed: state.examsPassed.has(id) }] : [];
  });
  return c.json({ unit: { id: u.id, stage: u.stage, title: u.title, can_do: u.can_do }, words, lessons, texts, tasks, listening, exams, progress: unitProgress(u, state) });
});

/** One listening item: situation, lines (shown after answering), questions; audio at /audio/lt/<id>.mp3. */
api.get("/course/listening/:id", (c) => {
  const l = LISTENING_BY_ID.get(c.req.param("id"));
  return l ? c.json(l) : c.json({ error: "unknown listening" }, 404);
});

api.post("/course/units/:id/check", async (c) => {
  const u = unitOf(c.req.param("id"));
  if (!u) return c.json({ error: "unknown unit" }, 404);
  const body = await c.req.json<{ correct?: number; total?: number }>().catch(() => ({}) as { correct?: number; total?: number });
  const total = Number(body.total), correct = Number(body.correct);
  if (!Number.isInteger(total) || !Number.isInteger(correct) || total < 1 || total > 50 || correct < 0 || correct > total) {
    return c.json({ error: "correct and total must be whole numbers, 0 ≤ correct ≤ total ≤ 50" }, 400);
  }
  const score = Math.round((correct / total) * 100);
  await c.env.DB.prepare(
    "INSERT INTO course_check (unit_id, best, last, checked_at) VALUES (?, ?, ?, ?) ON CONFLICT(unit_id) DO UPDATE SET best = MAX(best, excluded.best), last = excluded.last, checked_at = excluded.checked_at",
  )
    .bind(u.id, score, score, Date.now())
    .run();
  return c.json({ score, passed: score >= PASS_PERCENT });
});

api.post("/course/units/:id/known", async (c) => {
  const u = unitOf(c.req.param("id"));
  if (!u) return c.json({ error: "unknown unit" }, 404);
  const db = new Db(c.env.DB);
  const now = new Date();
  await savePlacement(db, [...u.phrases, ...u.words].map((itemId) => ({ itemId, known: true })), now);
  if (u.lessons.length) {
    await db.batch(u.lessons.map((id) => c.env.DB.prepare("INSERT OR IGNORE INTO grammar_done (lesson_id, done_at) VALUES (?, ?)").bind(id, now.getTime())));
  }
  // «Я это знаю» counts as a passed unit check, so the unit is complete even if its texts weren't read.
  await c.env.DB.prepare(
    "INSERT INTO course_check (unit_id, best, last, checked_at) VALUES (?, 100, 100, ?) ON CONFLICT(unit_id) DO UPDATE SET best = 100, last = 100, checked_at = excluded.checked_at",
  )
    .bind(u.id, now.getTime())
    .run();
  return c.json({ progress: unitProgress(u, await unitState(db, c.env.DB)) });
});

export const course: Feature = { id: "course", api };
