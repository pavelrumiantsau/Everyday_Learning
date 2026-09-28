// "Report a mistake": from a card in the Mini App or /report in the bot. Listed with `pnpm content:reports`.
import { Hono } from "hono";
import { ITEM_BY_ID } from "../content";
import type { Feature } from "../feature";

async function saveReport(d1: D1Database, r: { itemId?: string | null; cardId?: string | null; text?: string | null }) {
  await d1
    .prepare("INSERT INTO report (id, item_id, card_id, text, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), r.itemId ?? null, r.cardId ?? null, r.text?.slice(0, 1000) || null, Date.now())
    .run();
}

const api = new Hono<{ Bindings: Env }>();

api.post("/report", async (c) => {
  const b = await c.req.json<{ itemId?: string; cardId?: string; text?: string }>().catch(() => ({}) as Record<string, never>);
  if (!b.itemId && !b.text) return c.json({ error: "itemId or text required" }, 400);
  if (b.itemId && !ITEM_BY_ID.has(b.itemId) && !/^[a-z]{2}-[a-z]-\d{4}$/.test(b.itemId)) return c.json({ error: "unknown item" }, 400);
  await saveReport(c.env.DB, b);
  return c.json({ ok: true });
});

export const report: Feature = {
  id: "report",
  commands: [
    {
      name: "report",
      description: "Сообщить об ошибке в материалах",
      run: async (c, args) => {
        if (!args) return c.tg.sendMessage(c.ownerId, "Напиши, что не так: /report в слове «prarasti» неверное прошедшее время");
        await saveReport(c.env.DB, { text: args });
        return c.tg.sendMessage(c.ownerId, "🙏 Спасибо! Исправлю в следующей партии материалов.");
      },
    },
  ],
  api,
};
