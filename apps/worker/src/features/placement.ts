// Placement test: mark upcoming items you already know, so lessons skip them.
import { LANGS, langOf, newCard, reviewCard, type Lang } from "@el/core";
import { Hono } from "hono";
import { ITEM_BY_ID, ITEMS } from "../content";
import { cardIdFor, cardsForItem } from "../daily";
import { Db } from "../db";
import type { Feature } from "../feature";

const PLACEMENT_BATCH = 30;
const api = new Hono<{ Bindings: Env }>();

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

export const placement: Feature = { id: "placement", api };
