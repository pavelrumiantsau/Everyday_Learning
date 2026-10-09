// Mock exams of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.1, §6.5): the Mini App's «Пробный экзамен».
// Reading/writing and listening are answered in the Mini App (writing scored by the AI, 0–3 × 2), speaking in the bot chat
// by voice (features/tasks.ts). Results follow the NŠA rules (packages/core/src/exam.ts). Only on the foundation course of
// a personal copy; the original bot gets 404.
//   GET  /api/exams                  exams with the latest attempt's result and whether one was passed
//   GET  /api/exams/:id              the exam (no answers) + the latest attempt (answers of the parts already done)
//   POST /api/exams/:id/start        a new attempt
//   POST /api/exams/:id/rw           {answers: (number|null)[][], writing: string[]} → part 1 scored
//   POST /api/exams/:id/listening    {answers: (number|null)[][]} → part 2 scored
//   POST /api/exams/:id/speaking     part 3: the situations are sent to the bot chat
import { choicePoints, examListeningId, EXAM_PASS, EXAM_POINTS, SPEAKING_SITUATIONS, WRITING_WEIGHT, type Exam, type ExamLevel, type PartPoints } from "@el/core";
import { Hono } from "hono";
import { EXAM_BY_ID, EXAMS, TASK_BY_ID } from "../content";
import { Db } from "../db";
import { allAttempts, attemptResult, latestAttempt, savePart, startAttempt, type ExamAttempt } from "../exam-attempts";
import type { Feature } from "../feature";
import { resolveOwner } from "../owner";
import { onFoundation } from "../profile";
import { Telegram } from "../telegram";
import { scoreTask, startExamSpeaking } from "./tasks";

const MAX_WRITING = 2000;

/** The exam as the learner sees it before answering: no answers, no transcripts, no model answers. */
function publicExam(e: Exam) {
  return {
    id: e.id,
    level: e.level,
    title: e.title,
    points: { rw: e.level === "A1" ? { A1: EXAM_POINTS.rw.A1 } : EXAM_POINTS.rw, listening: e.level === "A1" ? { A1: EXAM_POINTS.listening.A1 } : EXAM_POINTS.listening, speaking: EXAM_POINTS.speaking },
    pass: EXAM_PASS,
    rw: e.rw.map((t) => {
      if (t.kind !== "writing") return { kind: t.kind, cefr: t.cefr, instruction: t.instruction, text: t.text, questions: t.questions.map((q) => ({ q: q.q, options: q.options })) };
      const w = TASK_BY_ID.get(t.task)!;
      return { kind: t.kind, cefr: t.cefr, id: w.id, title: w.title, situation: w.situation, prompt: w.prompt, words: w.words, checklist: w.checklist };
    }),
    listening: e.listening.map((t, i) => ({ cefr: t.cefr, instruction: t.instruction, audio: examListeningId(e.id, i), questions: t.questions.map((q) => ({ q: q.q, options: q.options })) })),
    speaking: e.speaking.map((id) => {
      const s = TASK_BY_ID.get(id)!;
      return { id, title: s.title, situation: s.situation, prompt: s.prompt };
    }),
  };
}

/** An attempt with what the learner may see: correct answers, transcripts and model answers of the parts already done. */
function attemptView(e: Exam, a: ExamAttempt | null) {
  if (!a) return null;
  const choice = e.rw.filter((t) => t.kind !== "writing");
  const writing = e.rw.flatMap((t) => (t.kind === "writing" ? [TASK_BY_ID.get(t.task)!] : []));
  return {
    id: a.id,
    startedAt: a.startedAt,
    finishedAt: a.finishedAt,
    rw: a.rw && {
      points: a.rw.points,
      answers: a.rw.answers,
      correct: choice.map((t) => t.questions.map((q) => q.answer)),
      writing: a.rw.writing.map((w, i) => ({ ...w, example: writing[i]?.example ?? "" })),
    },
    listening: a.listening && {
      points: a.listening.points,
      answers: a.listening.answers,
      correct: e.listening.map((t) => t.questions.map((q) => q.answer)),
      transcripts: e.listening.map((t) => t.lines),
    },
    speaking: a.speaking,
    result: attemptResult(e.level, a),
  };
}

/** Exams passed at their own level (for course progress). */
export async function examsPassed(d1: D1Database): Promise<Set<string>> {
  const passed = new Set<string>();
  for (const a of await allAttempts(d1)) {
    const e = EXAM_BY_ID.get(a.examId);
    const overall = e && attemptResult(e.level, a).overall;
    if (e && (overall === e.level || overall === "A2")) passed.add(e.id);
  }
  return passed;
}

/** `answers[task][question]`, shaped like the tasks; anything else becomes "no answer". */
function cleanAnswers(raw: unknown, tasks: readonly { questions: readonly unknown[] }[]): (number | null)[][] {
  const a = Array.isArray(raw) ? raw : [];
  return tasks.map((t, i) => t.questions.map((_, k) => {
    const v = Array.isArray(a[i]) ? (a[i] as unknown[])[k] : null;
    return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
  }));
}

const api = new Hono<{ Bindings: Env }>();

api.use("/exams/*", async (c, next) => (onFoundation() ? next() : c.json({ error: "no course" }, 404)));
api.use("/exams", async (c, next) => (onFoundation() ? next() : c.json({ error: "no course" }, 404)));

api.get("/exams", async (c) => {
  const passed = await examsPassed(c.env.DB);
  const list = await Promise.all(
    EXAMS.map(async (e) => {
      const a = await latestAttempt(c.env.DB, e.id);
      return { id: e.id, level: e.level, title: e.title, passed: passed.has(e.id), latest: a && { finished: !!a.finishedAt, result: attemptResult(e.level, a) } };
    }),
  );
  return c.json({ exams: list });
});

api.get("/exams/:id", async (c) => {
  const e = EXAM_BY_ID.get(c.req.param("id"));
  if (!e) return c.json({ error: "unknown exam" }, 404);
  return c.json({ exam: publicExam(e), attempt: attemptView(e, await latestAttempt(c.env.DB, e.id)) });
});

api.post("/exams/:id/start", async (c) => {
  const e = EXAM_BY_ID.get(c.req.param("id"));
  if (!e) return c.json({ error: "unknown exam" }, 404);
  await startAttempt(c.env.DB, e.id, Date.now());
  return c.json({ exam: publicExam(e), attempt: attemptView(e, await latestAttempt(c.env.DB, e.id)) });
});

/** The open attempt to answer a part in: the latest one, if that part isn't done yet. */
async function openAttempt(d1: D1Database, e: Exam, part: "rw" | "listening" | "speaking"): Promise<ExamAttempt | string> {
  const a = await latestAttempt(d1, e.id);
  if (!a) return "start the exam first";
  if (a[part]) return "this part is already done";
  return a;
}

api.post("/exams/:id/rw", async (c) => {
  const e = EXAM_BY_ID.get(c.req.param("id"));
  if (!e) return c.json({ error: "unknown exam" }, 404);
  const a = await openAttempt(c.env.DB, e, "rw");
  if (typeof a === "string") return c.json({ error: a }, 409);
  const body = await c.req.json<{ answers?: unknown; writing?: unknown }>().catch(() => ({}) as { answers?: unknown; writing?: unknown });
  const choice = e.rw.flatMap((t) => (t.kind === "writing" ? [] : [t]));
  const answers = cleanAnswers(body.answers, choice);
  const points: PartPoints = choicePoints(choice, answers);
  const tasks = e.rw.flatMap((t) => (t.kind === "writing" ? [{ cefr: t.cefr, task: TASK_BY_ID.get(t.task)! }] : []));
  const texts = tasks.map((_, i) => {
    const w = Array.isArray(body.writing) ? (body.writing as unknown[])[i] : "";
    return typeof w === "string" ? w.trim().slice(0, MAX_WRITING) : "";
  });
  const now = Date.now();
  let writing;
  try {
    // An empty answer gets 0 without asking the AI, as an unanswered task on the exam.
    writing = await Promise.all(tasks.map(async (t, i) => ({
      text: texts[i]!,
      feedback: texts[i] ? await scoreTask(c.env, t.task, texts[i]!, now) : { score: 0, checklist: t.task.checklist.map(() => false), corrected: "", mistakes: [], comment: "Нет ответа." },
    })));
  } catch (err) {
    console.error("exam writing failed:", err instanceof Error ? err.message.slice(0, 300) : "error");
    return c.json({ error: "ai unavailable" }, 503);
  }
  writing.forEach((w, i) => { points[tasks[i]!.cefr as ExamLevel] += w.feedback.score * WRITING_WEIGHT; });
  const saved = await savePart(c.env.DB, a.id, "rw", { points, answers, writing }, now);
  return c.json({ exam: publicExam(e), attempt: attemptView(e, saved) });
});

api.post("/exams/:id/listening", async (c) => {
  const e = EXAM_BY_ID.get(c.req.param("id"));
  if (!e) return c.json({ error: "unknown exam" }, 404);
  const a = await openAttempt(c.env.DB, e, "listening");
  if (typeof a === "string") return c.json({ error: a }, 409);
  const body = await c.req.json<{ answers?: unknown }>().catch(() => ({}) as { answers?: unknown });
  const answers = cleanAnswers(body.answers, e.listening);
  const saved = await savePart(c.env.DB, a.id, "listening", { points: choicePoints(e.listening, answers), answers }, Date.now());
  return c.json({ exam: publicExam(e), attempt: attemptView(e, saved) });
});

/** «Говорение в чате»: the situations go to the bot chat one by one (the Mini App then closes). */
api.post("/exams/:id/speaking", async (c) => {
  const e = EXAM_BY_ID.get(c.req.param("id"));
  if (!e) return c.json({ error: "unknown exam" }, 404);
  const a = await openAttempt(c.env.DB, e, "speaking");
  if (typeof a === "string") return c.json({ error: a }, 409);
  const db = new Db(c.env.DB);
  await startExamSpeaking(db, new Telegram(c.env.TELEGRAM_BOT_TOKEN, c.env.TELEGRAM_API_BASE), (await resolveOwner(c.env, db))!, e.id, a.id, Date.now());
  return c.json({ ok: true, situations: SPEAKING_SITUATIONS });
});

export const exams: Feature = { id: "exams", api };
