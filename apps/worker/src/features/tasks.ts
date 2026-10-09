// Writing tasks and speaking situations of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.5).
// /task (or «Сделать в чате» on a unit page) sends the next task; the learner's next text (writing) or voice message
// (speaking) is scored by the AI on the exam's 0–3 scale against the task's checklist. Only on the foundation course;
// the original bot doesn't list /task and has no tasks.
import { localClock, TASK_MAX_SCORE, type Task } from "@el/core";
import { TaskFeedback, taskFeedbackMessages } from "@el/llm";
import { Hono } from "hono";
import { COURSE, EXAM_BY_ID, TASK_BY_ID } from "../content";
import { attemptResult, savePart } from "../exam-attempts";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { onFoundation, aiProfile, timezone } from "../profile";
import { resolveOwner } from "../owner";
import { Telegram, type TgVoice } from "../telegram";
import { esc } from "./ai/format";
import { llmRouter, PROMPTS } from "./ai/llm";
import { AiStore } from "./ai/store";

const PENDING_KEY = "task_pending";
const PENDING_MS = 6 * 3600_000; // an answer counts for the task sent in the last 6 hours
const MAX_ANSWER = 2000;
const MAX_VOICE_SECONDS = 180;

/** `exam`: the speaking part of a mock exam — situations still to do and the scores so far. */
interface Pending { taskId: string; at: number; exam?: { attempt: number; examId: string; rest: string[]; scores: number[] } }

/** Best score per task. */
export async function bestScores(d1: D1Database): Promise<Map<string, number>> {
  const { results } = await d1.prepare("SELECT task_id, MAX(score) AS best FROM task_attempt GROUP BY task_id").all<{ task_id: string; best: number }>();
  return new Map(results.map((r) => [r.task_id, r.best]));
}

/** The next task to do: first one without an attempt, in course order; null when all were tried. */
async function nextTask(d1: D1Database): Promise<Task | null> {
  const best = await bestScores(d1);
  for (const u of COURSE?.units ?? []) for (const id of u.tasks) if (!best.has(id)) return TASK_BY_ID.get(id) ?? null;
  return null;
}

function taskMessage(t: Task): string {
  const how = t.kind === "writing" ? `✍️ Ответьте <b>текстом</b>${t.words ? ` (${t.words[0]}–${t.words[1]} слов)` : ""}.` : "🎙 Ответьте <b>голосовым сообщением</b> (1–2 минуты).";
  return [
    `${t.kind === "writing" ? "📝 Письменное задание" : "🗣 Устная ситуация"} · ${esc(t.title)}`,
    "",
    esc(t.situation),
    "",
    `<i>${esc(t.prompt)}</i>`,
    "",
    how,
    "Оценка — как на экзамене, 0–3. Передумали: /task skip",
  ].join("\n");
}

async function sendTask(db: Db, tg: Telegram, chatId: string, t: Task, now: number, exam?: Pending["exam"]) {
  await db.setSetting(PENDING_KEY, { taskId: t.id, at: now, exam } satisfies Pending).run();
  await tg.sendMessage(chatId, taskMessage(t));
}

/** Mock exam, speaking part: the situations are sent one after another; each voice answer is scored 0–3. */
export async function startExamSpeaking(db: Db, tg: Telegram, chatId: string, examId: string, attempt: number, now: number) {
  const ids = EXAM_BY_ID.get(examId)!.speaking;
  await tg.sendMessage(chatId, `🎓 <b>Пробный экзамен: говорение</b>\n\n${ids.length} ситуации, на каждую — голосовое сообщение (1–2 минуты). Оценка каждой — 0–3, как на экзамене.`);
  await sendTask(db, tg, chatId, TASK_BY_ID.get(ids[0]!)!, now, { attempt, examId, rest: ids.slice(1), scores: [] });
}

async function pendingTask(db: Db, now: number): Promise<{ task: Task; pending: Pending } | null> {
  const p = await db.getSetting<Pending>(PENDING_KEY);
  if (!p || now - p.at > PENDING_MS) return null;
  const task = TASK_BY_ID.get(p.taskId);
  return task ? { task, pending: p } : null;
}

const LEVEL_TEXT = (l: string | null) => (l ? `<b>${l}</b>` : "не сдано");

function formatResult(t: Task, f: TaskFeedback, footer = "Следующее задание: /task"): string {
  const lines = [`📊 <b>Оценка: ${f.score}/${TASK_MAX_SCORE}</b>`, ""];
  t.checklist.forEach((c, i) => lines.push(`${f.checklist[i] ? "✅" : "❌"} ${esc(c)}`));
  if (f.mistakes.length) {
    lines.push("", "✏️ <b>Исправления</b>");
    for (const m of f.mistakes.slice(0, 8)) lines.push(`• <s>${esc(m.original)}</s> → <b>${esc(m.corrected)}</b> — ${esc(m.explanation)}`);
  }
  if (f.comment) lines.push("", esc(f.comment));
  lines.push("", "💡 <b>Пример ответа</b>", `<i>${esc(t.example)}</i>`, ...(footer ? ["", footer] : []));
  return lines.join("\n");
}

/** Scores an answer with the AI; the attempt and the mistakes («Как правильно?» cards) are saved. */
export async function scoreTask(env: Env, t: Task, answer: string, now: number): Promise<TaskFeedback> {
  const store = new AiStore(env.DB);
  const r = await llmRouter(env, store).json(
    "task_feedback",
    { messages: taskFeedbackMessages(PROMPTS, aiProfile("lt"), t, answer.slice(0, MAX_ANSWER)), temperature: 0.2, maxTokens: 2500 },
    TaskFeedback,
  );
  const day = localClock(new Date(now), timezone()).day;
  await store.batch([
    env.DB.prepare("INSERT INTO task_attempt (task_id, score, created_at) VALUES (?, ?, ?)").bind(t.id, r.output.score, now),
    ...r.output.mistakes.map((m) => store.addMistake("lt", m, t.kind === "speaking" ? "voice" : "writing", day, now)),
  ]);
  console.log(`task ${t.id}: ${answer.length} chars → ${r.provider}/${r.model}, score ${r.output.score}`);
  return r.output;
}

/** Scores an answer and replies; in a mock exam, sends the next situation or the exam's speaking result. */
async function evaluate(ctx: BotContext, t: Task, answer: string, p: Pending) {
  await ctx.tg.sendChatAction(ctx.ownerId, "typing").catch(() => {});
  const now = Date.now();
  const f = await scoreTask(ctx.env, t, answer, now);
  await ctx.env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(PENDING_KEY).run();
  if (!p.exam) return void (await ctx.tg.sendMessage(ctx.ownerId, formatResult(t, f)));
  const exam = { ...p.exam, scores: [...p.exam.scores, f.score] };
  const next = exam.rest[0] ? TASK_BY_ID.get(exam.rest[0]) : undefined;
  await ctx.tg.sendMessage(ctx.ownerId, formatResult(t, f, next ? "Следующая ситуация ниже." : ""));
  if (next) return sendTask(ctx.db, ctx.tg, ctx.ownerId, next, now, { ...exam, rest: exam.rest.slice(1) });
  const a = await savePart(ctx.env.DB, exam.attempt, "speaking", { scores: exam.scores }, now);
  const level = EXAM_BY_ID.get(exam.examId)!.level;
  const r = attemptResult(level, a);
  const lines = [`🎓 <b>Говорение: ${exam.scores.join(" + ")}</b> — ${LEVEL_TEXT(r.speaking)}`];
  if (r.complete) lines.push("", `Чтение и письмо: ${LEVEL_TEXT(r.rw)} · Аудирование: ${LEVEL_TEXT(r.listening)} · Говорение: ${LEVEL_TEXT(r.speaking)}`, `<b>Итог экзамена: ${r.overall ?? "не сдан"}</b>`);
  else lines.push("", "Остальные части — в Mini App: «Курс» → «Пробный экзамен».");
  await ctx.tg.sendMessage(ctx.ownerId, lines.join("\n"));
}

async function transcribe(ctx: BotContext, v: TgVoice): Promise<string> {
  const store = new AiStore(ctx.env.DB);
  const file = await ctx.tg.getFile(v.file_id);
  if (!file.file_path) throw new Error("getFile returned no file_path");
  const audio = await ctx.tg.downloadFile(file.file_path);
  const tr = await llmRouter(ctx.env, store).transcribe("transcribe", { audio: new Blob([audio], { type: v.mime_type ?? "audio/ogg" }), filename: "voice.ogg", language: "lt" });
  return tr.text;
}

function background(ctx: BotContext, work: () => Promise<void>) {
  ctx.waitUntil(
    work().catch(async (err) => {
      console.error("task failed:", err instanceof Error ? err.message.slice(0, 300) : "error");
      await ctx.tg.sendMessage(ctx.ownerId, "⚠️ ИИ сейчас не отвечает. Ответ не потерян — отправьте его ещё раз через минуту.").catch(() => {});
    }),
  );
}

const api = new Hono<{ Bindings: Env }>();

/** «Сделать в чате»: sends the task to the bot chat (the Mini App then closes). */
api.post("/tasks/:id/start", async (c) => {
  if (!onFoundation()) return c.json({ error: "no course" }, 404);
  const t = TASK_BY_ID.get(c.req.param("id"));
  if (!t) return c.json({ error: "unknown task" }, 404);
  const db = new Db(c.env.DB);
  await sendTask(db, new Telegram(c.env.TELEGRAM_BOT_TOKEN, c.env.TELEGRAM_API_BASE), (await resolveOwner(c.env, db))!, t, Date.now());
  return c.json({ ok: true });
});

export const tasks: Feature = {
  id: "tasks",
  commands: [
    {
      name: "task",
      description: "Задание как на экзамене: письмо или устная ситуация",
      copyOnly: true,
      async run(c, args) {
        if (!onFoundation()) return c.tg.sendMessage(c.ownerId, "Задания есть в курсе литовского с нуля (/setup).");
        if (args.trim() === "skip") {
          await c.env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(PENDING_KEY).run();
          return c.tg.sendMessage(c.ownerId, "Хорошо, задание отложено. Новое: /task");
        }
        const t = (args.trim() && TASK_BY_ID.get(args.trim())) || (await nextTask(c.env.DB));
        if (!t) return c.tg.sendMessage(c.ownerId, "🎉 Все задания курса уже сделаны. Повторить любое можно со страницы юнита в «Курсе».");
        return sendTask(c.db, c.tg, c.ownerId, t, c.now.getTime());
      },
    },
  ],
  api,
  async onMessage(ctx, message) {
    if (!onFoundation()) return false;
    const pt = await pendingTask(ctx.db, Date.now());
    if (!pt) return false;
    const { task: t, pending } = pt;
    if (t.kind === "speaking" && message.voice) {
      if (message.voice.duration > MAX_VOICE_SECONDS) {
        await ctx.tg.sendMessage(ctx.ownerId, `🎙 Слишком длинно — до ${MAX_VOICE_SECONDS / 60} минут, как на экзамене.`);
        return true;
      }
      const v = message.voice;
      background(ctx, async () => {
        const text = await transcribe(ctx, v);
        if (!text) return void (await ctx.tg.sendMessage(ctx.ownerId, "🎙 Не расслышал ни слова. Попробуйте ещё раз, поближе к микрофону."));
        await ctx.tg.sendMessage(ctx.ownerId, `🎙 Я услышал: <i>${esc(text.slice(0, 1500))}</i>`);
        await evaluate(ctx, t, text, pending);
      });
      return true;
    }
    if (t.kind === "writing" && message.text?.trim()) {
      const text = message.text.trim();
      background(ctx, () => evaluate(ctx, t, text, pending));
      return true;
    }
    if (t.kind === "speaking" && message.text?.trim()) {
      await ctx.tg.sendMessage(ctx.ownerId, "🗣 Это устное задание — ответьте голосовым сообщением. Пропустить: /task skip");
      return true;
    }
    return false;
  },
};
