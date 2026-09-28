// Mini App flashcards: session numbers, due queue, answers (server-side FSRS, idempotent by review id).
import { langOf, localClock, reviewCard } from "@el/core";
import { Hono } from "hono";
import { ITEM_BY_ID, SCHEDULE } from "../content";
import { ensureCards } from "../daily";
import { Db } from "../db";
import type { Feature } from "../feature";
import { grammarQueueCard } from "./grammar";
import { ensureMistakeCards, mistakeQueueCards } from "./mistakes";
import { learnerItems } from "./reading";

const api = new Hono<{ Bindings: Env }>();

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
  await ensureMistakeCards(db, c.env.DB);
  const rows = await db.dueCards(Date.now(), limit);
  const fixes = await mistakeQueueCards(c.env.DB, rows.map((r) => r.item_id)); // "✏️ Как правильно?" cards from the learner's mistakes
  const mine = await learnerItems(c.env.DB, rows.map((r) => r.item_id)); // words added from reading
  const cards = rows.flatMap((r): object[] => {
    const fix = fixes.get(r.item_id);
    if (fix) return [fix];
    const own = mine.get(r.item_id);
    if (own) return [{ cardId: r.card_id, kind: r.card_id.slice(r.card_id.lastIndexOf(":") + 1), lang: r.item_id.slice(2, 4), item: own }];
    const item = ITEM_BY_ID.get(r.item_id);
    const kind = r.card_id.slice(r.card_id.lastIndexOf(":") + 1);
    if (item) return [{ cardId: r.card_id, kind, lang: langOf(item), item }];
    const cloze = grammarQueueCard(r.card_id); // grammar exercise card (lt-g-0001:cloze1)
    return cloze ? [cloze] : []; // skip items removed from content
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

export const review: Feature = { id: "review", api };
