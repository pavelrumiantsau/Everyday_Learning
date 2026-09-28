// JSON API for the Mini App. Every request carries Telegram's signed launch data:
//   Authorization: tma <window.Telegram.WebApp.initData>
import { LANGS, langOf, localClock, newCard, reviewCard, verifyInitData, type Lang } from "@el/core";
import { Hono } from "hono";
import { ITEM_BY_ID, ITEMS, SCHEDULE } from "./content";
import { cardIdFor, cardsForItem, ensureCards } from "./daily";
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

// --- Placement: mark upcoming items you already know, so lessons skip them.

const PLACEMENT_BATCH = 30;

api.get("/placement", async (c) => {
  const lang = (c.req.query("lang") ?? "lt") as Lang;
  if (!LANGS.includes(lang)) return c.json({ error: "unknown language" }, 400);
  const db = new Db(c.env.DB);
  const [introduced, placed, stats] = await Promise.all([db.introducedItemIds(), db.placedItemIds(), db.placementStats()]);
  const upcoming = ITEMS.filter((i) => langOf(i) === lang && !introduced.has(i.id) && !placed.has(i.id));
  return c.json({ items: upcoming.slice(0, PLACEMENT_BATCH), remaining: upcoming.length, stats });
});

api.post("/placement", async (c) => {
  const body = await c.req.json<{ results?: { itemId: string; known: boolean }[] }>().catch(() => ({}) as { results?: never[] });
  const db = new Db(c.env.DB);
  const now = new Date();
  const at = now.getTime();
  const introduced = await db.introducedItemIds();
  const stmts: D1PreparedStatement[] = [];
  for (const r of (body.results ?? []).slice(0, 200)) {
    const item = ITEM_BY_ID.get(r.itemId);
    if (!item || typeof r.known !== "boolean") continue;
    stmts.push(db.savePlacement(item.id, r.known, at));
    if (!r.known || introduced.has(item.id)) continue;
    // Known: the meaning card starts with an "Easy" answer (next check in weeks);
    // a verb's forms card starts fresh — knowing the meaning doesn't mean knowing the forms.
    for (const kind of cardsForItem(item)) {
      const card = kind === "recog" ? reviewCard(newCard(now), now, 4) : newCard(now);
      stmts.push(db.insertCard(cardIdFor(item.id, kind), item.id, langOf(item), card, at));
      if (kind === "recog") stmts.push(db.logReview(cardIdFor(item.id, kind), 4, at, "placement"));
    }
  }
  if (stmts.length) await db.batch(stmts);
  return c.json({ saved: stmts.length > 0, stats: await db.placementStats() });
});
