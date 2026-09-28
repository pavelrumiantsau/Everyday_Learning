// JSON API for the Mini App. Every request carries Telegram's signed launch data:
//   Authorization: tma <window.Telegram.WebApp.initData>
import { langOf, localClock, reviewCard, verifyInitData } from "@el/core";
import { Hono } from "hono";
import { ITEM_BY_ID, SCHEDULE } from "./content";
import { ensureCards } from "./daily";
import { Db } from "./db";

export const api = new Hono<{ Bindings: Env }>();

api.use("*", async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  if (!auth.startsWith("tma ")) return c.json({ error: "open the app from Telegram" }, 401);
  const result = await verifyInitData(auth.slice(4), c.env.TELEGRAM_BOT_TOKEN);
  if (!result.ok) return c.json({ error: result.reason }, 401);
  if (result.userId !== c.env.TELEGRAM_USER_ID) return c.json({ error: "not your bot" }, 403);
  await next();
});

api.get("/session", async (c) => {
  const db = new Db(c.env.DB);
  const now = new Date();
  const { day } = localClock(now, SCHEDULE.timezone);
  const [today, due, known] = await Promise.all([db.getDay(day), db.countDue(now.getTime()), db.countCards()]);
  return c.json({ day, reviewsToday: today.reviews, newToday: today.new_cards, due, known });
});

const QUEUE_MAX = 200;

api.get("/queue", async (c) => {
  const db = new Db(c.env.DB);
  const limit = Math.min(Number(c.req.query("limit") ?? 100) || 100, QUEUE_MAX);
  await ensureCards(db);
  const rows = await db.dueCards(Date.now(), limit);
  const cards = rows.flatMap((r) => {
    const item = ITEM_BY_ID.get(r.item_id);
    const kind = r.card_id.slice(r.card_id.lastIndexOf(":") + 1);
    return item ? [{ cardId: r.card_id, kind, lang: langOf(item), item }] : []; // skip items removed from content
  });
  return c.json({ cards });
});

type ReviewIn = { id: string; cardId: string; rating: 1 | 2 | 3 | 4; reviewedAt: number };

api.post("/reviews", async (c) => {
  const body = await c.req.json<{ reviews?: ReviewIn[] }>().catch(() => ({}) as { reviews?: ReviewIn[] });
  const reviews = (body.reviews ?? [])
    .filter((r) => typeof r.id === "string" && typeof r.cardId === "string" && [1, 2, 3, 4].includes(r.rating) && Number.isFinite(r.reviewedAt))
    .sort((a, b) => a.reviewedAt - b.reviewedAt)
    .slice(0, 500);

  const db = new Db(c.env.DB);
  const now = Date.now();
  let applied = 0;
  for (const r of reviews) {
    if (await db.reviewExists(r.id)) continue; // already applied (retry after a lost response)
    const row = await db.getCard(r.cardId);
    if (!row) continue;
    const at = Math.min(r.reviewedAt, now); // never trust a clock from the future
    const next = reviewCard(JSON.parse(row.fsrs), new Date(at), r.rating);
    await db.batch([
      db.updateCard(r.cardId, next),
      db.logReview(r.cardId, r.rating, at, "miniapp", r.id),
      db.bumpDay(localClock(new Date(at), SCHEDULE.timezone).day, "reviews"),
    ]);
    applied++;
  }
  return c.json({ applied, received: reviews.length });
});
