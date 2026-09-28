// AI features: /tutor chat (LT/ES/FR), writing feedback on any target-language text, voice messages (Whisper → tutor/feedback).
// Slow AI calls run in ctx.waitUntil so the webhook answers Telegram at once; "typing…" shows meanwhile.
import { localClock } from "@el/core";
import { detectLang, feedbackMessages, isTargetLang, langFromWhisper, PROFILES, tutorMessages, TutorReply, WritingFeedback, type TargetLang } from "@el/llm";
import { SCHEDULE } from "../content";
import type { BotContext, Feature } from "../feature";
import type { TgVoice } from "../telegram";
import { esc, formatFeedback, formatTutor } from "./ai/format";
import { llmRouter, PROMPTS } from "./ai/llm";
import { AiStore, type TutorSession } from "./ai/store";

const MAX_TEXT = 2000; // characters sent to the model per message
const MAX_VOICE_SECONDS = 300;
const LANG_NAME_RU: Record<TargetLang, string> = { lt: "литовский", es: "испанский", fr: "французский" };
const AI_DOWN = "⚠️ ИИ сейчас не отвечает (все провайдеры заняты или недоступны). Попробуй через минуту.";

type Source = "tutor" | "writing" | "voice";

/** Runs slow work after the webhook returned; failures become a short message, logs never contain the user's text. */
function background(ctx: BotContext, label: string, work: () => Promise<void>) {
  ctx.waitUntil(
    work().catch(async (err) => {
      console.error(`${label} failed:`, err instanceof Error ? err.message.slice(0, 300) : "error");
      await ctx.tg.sendMessage(ctx.ownerId, AI_DOWN).catch(() => {});
    }),
  );
}

const typing = (ctx: BotContext) => ctx.tg.sendChatAction(ctx.ownerId, "typing").catch(() => {});

/** One tutor turn: the reply in the target language + corrections of `userText` (none for the opening turn). */
async function tutorTurn(ctx: BotContext, store: AiStore, session: TutorSession, userText: string | undefined, source: Source) {
  await typing(ctx);
  const profile = PROFILES[session.lang];
  const history = await store.recentTurns(session.id);
  const text = userText?.slice(0, MAX_TEXT);
  const t0 = Date.now();
  const r = await llmRouter(ctx.env, store).json(
    "tutor_chat",
    { messages: tutorMessages(PROMPTS, profile, session.topic ?? undefined, history, text), temperature: 0.7, maxTokens: 2000 },
    TutorReply,
  );
  console.log(`tutor ${session.lang}: ${text?.length ?? 0} chars → ${r.provider}/${r.model} in ${Date.now() - t0} ms, ${r.output.corrections.length} corrections`);

  const now = Date.now();
  const day = localClock(new Date(now), SCHEDULE.timezone).day;
  await store.batch([
    ...(text !== undefined ? [store.addTurn(session.id, "user", text, now)] : []),
    store.addTurn(session.id, "assistant", r.output.reply, now + 1),
    store.touchSession(session.id, now),
    ...(text !== undefined ? r.output.corrections.map((m) => store.addMistake(session.lang, m, source === "voice" ? "voice" : "tutor", day, now)) : []),
  ]);
  await ctx.tg.sendMessage(ctx.ownerId, formatTutor(r.output));
}

/** Writing feedback outside a tutor session: corrected text + explanations; mistakes are saved. */
async function feedback(ctx: BotContext, store: AiStore, lang: TargetLang, userText: string, source: Source) {
  await typing(ctx);
  const profile = PROFILES[lang];
  const text = userText.slice(0, MAX_TEXT);
  const t0 = Date.now();
  const r = await llmRouter(ctx.env, store).json("writing_feedback", { messages: feedbackMessages(PROMPTS, profile, text), temperature: 0.2, maxTokens: 2500 }, WritingFeedback);
  console.log(`feedback ${lang}: ${text.length} chars → ${r.provider}/${r.model} in ${Date.now() - t0} ms, ${r.output.mistakes.length} mistakes`);
  if (r.output.is_target_language && r.output.mistakes.length) {
    const now = Date.now();
    const day = localClock(new Date(now), SCHEDULE.timezone).day;
    await store.batch(r.output.mistakes.map((m) => store.addMistake(lang, m, source === "voice" ? "voice" : "writing", day, now)));
  }
  await ctx.tg.sendMessage(ctx.ownerId, formatFeedback(profile, r.output));
}

/** Voice message: download (memory only) → Whisper → show the transcript → tutor reply or feedback. */
async function voice(ctx: BotContext, store: AiStore, v: TgVoice) {
  await ctx.tg.sendChatAction(ctx.ownerId, "typing").catch(() => {});
  const session = await store.activeSession(Date.now());
  const file = await ctx.tg.getFile(v.file_id);
  if (!file.file_path) throw new Error("getFile returned no file_path");
  const audio = await ctx.tg.downloadFile(file.file_path);
  const tr = await llmRouter(ctx.env, store).transcribe("transcribe", {
    audio: new Blob([audio], { type: v.mime_type ?? "audio/ogg" }),
    filename: "voice.ogg", // Telegram voice notes are OGG/Opus (.oga); Whisper accepts the .ogg name
    language: session?.lang,
  });
  console.log(`voice: ${v.duration} s → ${tr.provider}/${tr.model}, ${tr.text.length} chars, lang ${tr.language ?? "?"}`);
  if (!tr.text) {
    await ctx.tg.sendMessage(ctx.ownerId, "🎙 Не расслышал ни слова. Попробуй ещё раз, поближе к микрофону.");
    return;
  }
  await ctx.tg.sendMessage(ctx.ownerId, `🎙 Я услышал: <i>${esc(tr.text.slice(0, 1500))}</i>`);
  if (session) return tutorTurn(ctx, store, session, tr.text, "voice");
  const lang = langFromWhisper(tr.language) ?? detectLang(tr.text);
  if (!lang) {
    await ctx.tg.sendMessage(ctx.ownerId, "Не узнал язык — проверяю литовский, испанский и французский. Для разговора: /tutor");
    return;
  }
  return feedback(ctx, store, lang, tr.text, "voice");
}

function parseTutorArgs(args: string): { lang: TargetLang; topic: string | null } {
  const [first = "", ...rest] = args.split(/\s+/).filter(Boolean);
  if (isTargetLang(first.toLowerCase())) return { lang: first.toLowerCase() as TargetLang, topic: rest.join(" ") || null };
  return { lang: "lt", topic: args.trim() || null };
}

async function usageText(ctx: BotContext): Promise<string> {
  const store = new AiStore(ctx.env.DB);
  const d = ctx.now;
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const [rows, mistakes, session] = await Promise.all([store.usageSince(monthStart), store.mistakeCount(monthStart), store.activeSession(d.getTime())]);
  const lines = ["🤖 <b>ИИ в этом месяце</b>"];
  if (!rows.length) lines.push("Запросов пока не было.");
  for (const r of rows) {
    const size = r.audio_seconds ? `${Math.round(r.audio_seconds / 60)} мин аудио` : `${r.input_tokens + r.output_tokens} токенов`;
    lines.push(`• ${esc(r.provider)} ${esc(r.model)}: ${r.ok}/${r.calls} ок, ${size}, ≈ $${r.cost_usd.toFixed(3)}`);
  }
  lines.push(`Ошибок сохранено: ${mistakes}`);
  if (session) lines.push(`Сейчас идёт /tutor ${session.lang} (${LANG_NAME_RU[session.lang]}), /stop — закончить.`);
  lines.push("", "Цена — оценка по прайсу; на бесплатном тарифе Groq/Gemini платить не нужно.");
  return lines.join("\n");
}

export const tutor: Feature = {
  id: "tutor",
  commands: [
    {
      name: "tutor",
      description: "Чат с тьютором: /tutor [lt|es] [тема]",
      async run(ctx, args) {
        const store = new AiStore(ctx.env.DB);
        const { lang, topic } = parseTutorArgs(args);
        const session = await store.startSession(lang, topic, Date.now());
        const p = PROFILES[lang];
        await ctx.tg.sendMessage(
          ctx.ownerId,
          `${p.flag} <b>Тьютор: ${LANG_NAME_RU[lang]}</b>${topic ? ` — тема: ${esc(topic)}` : ""}\n` +
            `Пиши или говори (голосовым) на языке. После каждого ответа — исправления (${lang === "lt" ? "по-русски" : "по-английски"}).\n/stop — закончить.`,
        );
        background(ctx, "tutor start", () => tutorTurn(ctx, store, session, undefined, "tutor"));
      },
    },
    {
      name: "stop",
      description: "Закончить чат с тьютором",
      async run(ctx) {
        const store = new AiStore(ctx.env.DB);
        const session = await store.activeSession(Date.now());
        await store.endSessions(Date.now());
        if (!session) return ctx.tg.sendMessage(ctx.ownerId, "Чат с тьютором не запущен. Начать: /tutor");
        const turns = await store.sessionTurnCount(session.id);
        return ctx.tg.sendMessage(ctx.ownerId, `👋 Чат закончен (${turns} сообщ.). Ошибки сохранены. Viso gero!`);
      },
    },
    { name: "ai", description: "ИИ: запросы и расходы за месяц", menu: false, run: async (ctx) => ctx.tg.sendMessage(ctx.ownerId, await usageText(ctx)) },
  ],

  async onMessage(ctx, message) {
    const store = new AiStore(ctx.env.DB);
    if (message.voice) {
      if (message.voice.duration > MAX_VOICE_SECONDS) {
        await ctx.tg.sendMessage(ctx.ownerId, `🎙 Слишком длинное голосовое (максимум ${MAX_VOICE_SECONDS / 60} мин).`);
        return true;
      }
      const v = message.voice;
      background(ctx, "voice", () => voice(ctx, store, v));
      return true;
    }
    const text = message.text?.trim();
    if (!text) return false;
    const session = await store.activeSession(Date.now());
    if (session) {
      background(ctx, "tutor", () => tutorTurn(ctx, store, session, text, "tutor"));
      return true;
    }
    const lang = detectLang(text);
    if (!lang) return false;
    background(ctx, "feedback", () => feedback(ctx, store, lang, text, "writing"));
    return true;
  },
};
