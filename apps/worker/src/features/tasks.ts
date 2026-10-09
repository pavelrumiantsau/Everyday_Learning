// Writing tasks and speaking situations of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.5).
// /task (or «Сделать в чате» on a unit page) sends the next task; the learner's next text (writing) or voice message
// (speaking) is scored by the AI on the exam's 0–3 scale against the task's checklist. Only on the foundation course;
// the original bot doesn't list /task and has no tasks.
import { localClock, TASK_MAX_SCORE, type Task } from "@el/core";
import { TaskFeedback, taskFeedbackMessages } from "@el/llm";
import { Hono } from "hono";
import { COURSE, TASK_BY_ID } from "../content";
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

interface Pending { taskId: string; at: number }

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

async function sendTask(db: Db, tg: Telegram, chatId: string, t: Task, now: number) {
  await db.setSetting(PENDING_KEY, { taskId: t.id, at: now } satisfies Pending).run();
  await tg.sendMessage(chatId, taskMessage(t));
}

async function pendingTask(db: Db, now: number): Promise<Task | null> {
  const p = await db.getSetting<Pending>(PENDING_KEY);
  if (!p || now - p.at > PENDING_MS) return null;
  return TASK_BY_ID.get(p.taskId) ?? null;
}

function formatResult(t: Task, f: TaskFeedback): string {
  const lines = [`📊 <b>Оценка: ${f.score}/${TASK_MAX_SCORE}</b>`, ""];
  t.checklist.forEach((c, i) => lines.push(`${f.checklist[i] ? "✅" : "❌"} ${esc(c)}`));
  if (f.mistakes.length) {
    lines.push("", "✏️ <b>Исправления</b>");
    for (const m of f.mistakes.slice(0, 8)) lines.push(`• <s>${esc(m.original)}</s> → <b>${esc(m.corrected)}</b> — ${esc(m.explanation)}`);
  }
  if (f.comment) lines.push("", esc(f.comment));
  lines.push("", "💡 <b>Пример ответа</b>", `<i>${esc(t.example)}</i>`, "", "Следующее задание: /task");
  return lines.join("\n");
}

/** Scores an answer and replies; the attempt and the mistakes («Как правильно?» cards) are saved. */
async function evaluate(ctx: BotContext, t: Task, answer: string) {
  await ctx.tg.sendChatAction(ctx.ownerId, "typing").catch(() => {});
  const store = new AiStore(ctx.env.DB);
  const r = await llmRouter(ctx.env, store).json(
    "task_feedback",
    { messages: taskFeedbackMessages(PROMPTS, aiProfile("lt"), t, answer.slice(0, MAX_ANSWER)), temperature: 0.2, maxTokens: 2500 },
    TaskFeedback,
  );
  const now = Date.now();
  const day = localClock(new Date(now), timezone()).day;
  await store.batch([
    ctx.env.DB.prepare("INSERT INTO task_attempt (task_id, score, created_at) VALUES (?, ?, ?)").bind(t.id, r.output.score, now),
    ctx.env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(PENDING_KEY),
    ...r.output.mistakes.map((m) => store.addMistake("lt", m, t.kind === "speaking" ? "voice" : "writing", day, now)),
  ]);
  console.log(`task ${t.id}: ${answer.length} chars → ${r.provider}/${r.model}, score ${r.output.score}`);
  await ctx.tg.sendMessage(ctx.ownerId, formatResult(t, r.output));
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
    const t = await pendingTask(ctx.db, Date.now());
    if (!t) return false;
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
        await evaluate(ctx, t, text);
      });
      return true;
    }
    if (t.kind === "writing" && message.text?.trim()) {
      const text = message.text.trim();
      background(ctx, () => evaluate(ctx, t, text));
      return true;
    }
    if (t.kind === "speaking" && message.text?.trim()) {
      await ctx.tg.sendMessage(ctx.ownerId, "🗣 Это устное задание — ответьте голосовым сообщением. Пропустить: /task skip");
      return true;
    }
    return false;
  },
};
