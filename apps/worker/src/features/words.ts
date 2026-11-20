// «Мои слова»: every word the learner has as cards in a language (course words and words added from reading), newest first,
// with the meaning, whether it is learned (same rule as Db.learnedItemIds) and when it comes back for review.
import { EXPLANATION_LANG, LANGS, learnerItemId, reviewCard, type CardJson, type Item, type Lang } from "@el/core";
import { Hono } from "hono";
import { ITEM_BY_ID } from "../content";
import { Db } from "../db";
import type { Feature } from "../feature";

/** Cards moved out of the review queue (due set to the year 2100 or later) are listed as «отложено». */
const RETIRED_FROM = Date.UTC(2100, 0, 1);

export interface WordRow { id: string; text: string; stress: string | null; meaning: string; learned: boolean; due: number | null; fromReading: boolean }

const api = new Hono<{ Bindings: Env }>();

api.get("/words", async (c) => {
  const lang = c.req.query("lang") as Lang;
  if (!LANGS.includes(lang)) return c.json({ error: "lang lt|es|fr" }, 400);
  const [cards, own] = await Promise.all([
    c.env.DB.prepare(
      `SELECT item_id, MIN(due) AS due, MIN(introduced_at) AS introduced_at,
              MAX(card_id LIKE '%:recog' AND json_extract(fsrs, '$.state') IN (2, 3)) AS learned
       FROM card_state WHERE lang = ? AND card_id NOT LIKE '%-g-%' GROUP BY item_id ORDER BY introduced_at DESC, item_id`,
    )
      .bind(lang)
      .all<{ item_id: string; due: number; introduced_at: number; learned: number }>(),
    c.env.DB.prepare("SELECT n, data FROM learner_item WHERE lang = ?").bind(lang).all<{ n: number; data: string }>(),
  ]);
  const ownById = new Map(own.results.map((r) => [learnerItemId(lang, r.n), JSON.parse(r.data) as Omit<Item, "id">]));
  const expl = EXPLANATION_LANG[lang];
  const words: WordRow[] = cards.results.flatMap((r) => {
    const item = ITEM_BY_ID.get(r.item_id) ?? ownById.get(r.item_id);
    if (!item) return []; // grammar exercises, mistakes, removed items
    return [{
      id: r.item_id,
      text: item.text,
      stress: item.stress ?? null,
      meaning: item.meaning[expl] ?? "",
      learned: r.learned === 1,
      due: r.due >= RETIRED_FROM ? null : r.due,
      fromReading: ownById.has(r.item_id),
    }];
  });
  return c.json({ words });
});

/**
 * A learned word the learner doesn't trust: "relearn" («Плохо помню») rates its cards "Снова", so FSRS starts the intervals
 * again from minutes; "now" («Повторить сейчас») only makes its cards due now and keeps the schedule's memory.
 * Only cards in Review/Relearning are touched (a word still being learned is in «Учить новые слова»), never «отложено» ones.
 * Not logged as a review: it is the learner's choice, not an answer, so it stays out of reviews today and the retention numbers.
 */
api.post("/words/again", async (c) => {
  const body = await c.req.json<{ id?: unknown; mode?: unknown }>().catch(() => ({}) as { id?: unknown; mode?: unknown });
  const { id, mode } = body;
  if (typeof id !== "string" || (mode !== "relearn" && mode !== "now")) return c.json({ error: "id, mode relearn|now" }, 400);
  const now = Date.now();
  const { results } = await c.env.DB.prepare(
    `SELECT card_id, fsrs FROM card_state WHERE item_id = ? AND card_id NOT LIKE '%-g-%' AND due < ? AND json_extract(fsrs, '$.state') IN (2, 3)`,
  )
    .bind(id, RETIRED_FROM)
    .all<{ card_id: string; fsrs: string }>();
  if (!results.length) return c.json({ error: "not a learned word" }, 404);
  const db = new Db(c.env.DB);
  await db.batch(
    results.map((r) => {
      const card = JSON.parse(r.fsrs) as CardJson;
      return db.updateCard(r.card_id, mode === "relearn" ? reviewCard(card, new Date(now), 1) : { ...card, due: new Date(now) });
    }),
  );
  return c.json({ updated: results.length });
});

export const words: Feature = { id: "words", api };
