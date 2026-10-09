// Mini App flashcards: session numbers, due queue, new words to learn, answers (server-side FSRS, idempotent by review id).
import { chosenLangs, langOf, LANGS, localClock, reviewCard } from "@el/core";
import { Hono } from "hono";
import { ITEM_BY_ID } from "../content";
import { ensureCards } from "../daily";
import { Db, type CardRow } from "../db";
import type { Feature } from "../feature";
import { grammarQueueCard } from "./grammar";
import { ensureMistakeCards, mistakeQueueCards } from "./mistakes";
import { learnerItems } from "./reading";
import { currentProfile, needsSetup, onFoundation, timezone } from "../profile";

const api = new Hono<{ Bindings: Env }>();

api.get("/session", async (c) => {
  const db = new Db(c.env.DB);
  const now = new Date();
  const { day } = localClock(now, timezone());
  const [today, due, learning, known] = await Promise.all([db.getDay(day), db.countDue(now.getTime()), db.countLearning(), db.countCards()]);
  const p = currentProfile();
  // langs: the languages this learner studies (all three in the original plan); needsSetup: a copy before the wizard.
  return c.json({ day, reviewsToday: today.reviews, newToday: today.new_cards, due, learning, known, langs: p ? chosenLangs(p) : LANGS, needsSetup: needsSetup(c.env),
    // course: the Lithuanian foundation course is on; strictLetters: exam practice (a for ą is wrong), with an A2 exam goal.
    course: onFoundation(), strictLetters: onFoundation() && !!p?.languages.lt?.exam });
});

const QUEUE_MAX = 200;

api.get("/queue", async (c) => {
  const db = new Db(c.env.DB);
  const limit = Math.min(Number(c.req.query("limit") ?? 100) || 100, QUEUE_MAX);
  await ensureCards(db);
  await ensureMistakeCards(db, c.env.DB);
  const rows = await db.dueCards(Date.now(), limit);
  return c.json({ cards: await queueCards(c.env.DB, rows) });
});

const LEARN_MAX = 100;

/** «Учить новые слова»: meaning cards of introduced words that are not learned yet (not due-filtered), plus how many there are. */
api.get("/learn", async (c) => {
  const db = new Db(c.env.DB);
  const limit = Math.min(Number(c.req.query("limit") ?? 5) || 5, LEARN_MAX);
  const [rows, total] = await Promise.all([db.learningCards(limit), db.countLearning()]);
  return c.json({ cards: await queueCards(c.env.DB, rows), total });
});

/** Card rows → what the Mini App shows: course words, the learner's own words, grammar cloze and mistake cards. */
async function queueCards(d1: D1Database, rows: CardRow[]): Promise<object[]> {
  const fixes = await mistakeQueueCards(d1, rows.map((r) => r.item_id)); // "✏️ Как правильно?" cards from the learner's mistakes
  const mine = await learnerItems(d1, rows.map((r) => r.item_id)); // words added from reading
  return rows.flatMap((r): object[] => {
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
}

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
      db.bumpDay(localClock(new Date(at), timezone()).day, "reviews"),
    ]);
    applied++;
  }
  return c.json({ applied, received: reviews.length });
});

export const review: Feature = { id: "review", api };
