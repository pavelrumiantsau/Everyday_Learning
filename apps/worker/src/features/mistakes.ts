// The learner's own mistakes (saved by the AI tutor/feedback) become review cards ("✏️ Как правильно?"),
// and once a week the AI writes a short review of recurring mistakes with practice sentences (/review, Sunday).
import { escapeHtml, newCard, sameIgnoringPunctuation, type Lang } from "@el/core";
import { PROFILES, render, type TargetLang } from "@el/llm";
import type { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { llmRouter, PROMPTS } from "./ai/llm";
import { AiStore } from "./ai/store";

const NEW_FIX_CARDS_PER_CALL = 10;
const DAY_MS = 86_400_000;

interface MistakeRow { id: number; lang: Lang; original: string; corrected: string; explanation: string }

export const mistakeCardId = (id: number) => `m-${id}:fix`;

/** Creates "fix" cards for recent mistakes that don't have one yet (skips punctuation-only corrections). */
export async function ensureMistakeCards(db: Db, d1: D1Database, now = new Date()): Promise<number> {
  const { results } = await d1
    .prepare(
      `SELECT m.id, m.lang, m.original, m.corrected FROM mistakes m
       LEFT JOIN card_state c ON c.item_id = 'm-' || m.id
       WHERE c.item_id IS NULL ORDER BY m.id DESC LIMIT ?`,
    )
    .bind(NEW_FIX_CARDS_PER_CALL * 3)
    .all<MistakeRow>();
  const fresh = results.filter((m) => !sameIgnoringPunctuation(m.original, m.corrected)).slice(0, NEW_FIX_CARDS_PER_CALL);
  if (fresh.length) await db.batch(fresh.map((m) => db.insertCard(mistakeCardId(m.id), `m-${m.id}`, m.lang, newCard(now), now.getTime())));
  return fresh.length;
}

/** Queue entries for fix cards among the due rows. */
export async function mistakeQueueCards(d1: D1Database, itemIds: string[]): Promise<Map<string, object>> {
  const ids = itemIds.filter((i) => i.startsWith("m-")).map((i) => Number(i.slice(2))).filter(Number.isInteger);
  if (!ids.length) return new Map();
  const { results } = await d1
    .prepare(`SELECT id, lang, original, corrected, explanation FROM mistakes WHERE id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids)
    .all<MistakeRow>();
  return new Map(
    results.map((m) => [
      `m-${m.id}`,
      { cardId: mistakeCardId(m.id), kind: "fix", lang: m.lang, mistake: { original: m.original, corrected: m.corrected, explanation: m.explanation } },
    ]),
  );
}

export async function sendWritingReview(c: BotContext, onlyIfEnough = true): Promise<boolean> {
  const since = c.now.getTime() - 7 * DAY_MS;
  const { results } = await c.env.DB.prepare(
    "SELECT lang, original, corrected, explanation FROM mistakes WHERE created_at >= ? ORDER BY created_at DESC LIMIT 200",
  )
    .bind(since)
    .all<MistakeRow>();
  let sent = false;
  for (const lang of ["lt", "es", "fr"] as const) {
    const list = results.filter((m) => m.lang === lang && !sameIgnoringPunctuation(m.original, m.corrected)).slice(0, 80);
    if (list.length < (onlyIfEnough ? 3 : 1)) continue;
    const p = PROFILES[lang as TargetLang];
    const system = render(PROMPTS["feedback/weekly"] ?? "", { lang_name: p.name, explain_lang: p.explainIn, level: p.level });
    const user = list.map((m) => `${m.original} → ${m.corrected}${m.explanation ? ` (${m.explanation})` : ""}`).join("\n");
    const r = await llmRouter(c.env, new AiStore(c.env.DB)).chat("weekly_review", {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      maxTokens: 1500,
    });
    const flag = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" }[lang];
    await c.tg.sendMessage(c.ownerId, `🧑‍🏫 <b>Разбор ошибок за неделю ${flag}</b> (${list.length})\n\n${escapeHtml(r.text.trim()).slice(0, 3500)}`);
    sent = true;
  }
  return sent;
}

export const mistakes: Feature = {
  id: "mistakes",
  commands: [
    {
      name: "review",
      description: "Разбор моих ошибок за неделю",
      run: async (c) => {
        await c.tg.sendChatAction(c.ownerId, "typing");
        const sent = await sendWritingReview(c, false);
        if (!sent) await c.tg.sendMessage(c.ownerId, "За последние 7 дней ошибок не сохранено — пиши боту на литовском или поговори в /tutor.");
      },
    },
  ],
};

