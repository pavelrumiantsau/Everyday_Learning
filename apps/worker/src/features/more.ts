// "More today": on days with extra time, take the next new words now instead of waiting for tomorrow's morning lesson.
// /more — the next daily portion of every active language; /more es — Spanish only; /more lt 20 — 20 Lithuanian words.
// The words are introduced as cards straight away (due now); the next morning simply continues after them.
import { formatNewItem, pickNewItems, type Item, type Lang } from "@el/core";
import { Hono } from "hono";
import { ITEMS } from "../content";
import { introduceItems, learnButton } from "../daily";
import { Db } from "../db";
import type { Feature } from "../feature";
import { getPrefs } from "../prefs";

const LANGS: readonly Lang[] = ["lt", "es", "fr"];
const MAX_PER_LANG = 30;
const DEFAULT_WHEN_OFF = 5; // /more fr while French is still at 0 new per day

/** Parses "es", "20", "lt 20" → which language(s) and how many. */
export function parseMoreArgs(args: string): { lang?: Lang; n?: number } {
  const out: { lang?: Lang; n?: number } = {};
  for (const t of args.toLowerCase().split(/\s+/).filter(Boolean)) {
    if ((LANGS as readonly string[]).includes(t)) out.lang = t as Lang;
    else if (/^\d+$/.test(t)) out.n = Math.min(Number(t), MAX_PER_LANG);
  }
  return out;
}

/** Introduces the next new items now. Without a language: one more daily portion of each language that is on. */
export async function introduceMore(db: Db, now: Date, opts: { lang?: Lang; n?: number } = {}): Promise<Item[]> {
  const [prefs, introduced] = await Promise.all([getPrefs(db), db.introducedItemIds()]);
  const counts: Partial<Record<Lang, number>> = {};
  for (const lang of opts.lang ? [opts.lang] : LANGS) {
    const daily = prefs.new_per_day[lang] ?? 0;
    const n = opts.n ?? (daily || (opts.lang ? DEFAULT_WHEN_OFF : 0));
    if (n > 0) counts[lang] = Math.min(n, MAX_PER_LANG);
  }
  const fresh = pickNewItems(ITEMS, introduced, counts);
  await introduceItems(db, fresh, now);
  return fresh;
}

const api = new Hono<{ Bindings: Env }>();

api.post("/more", async (c) => {
  const body = await c.req.json<{ lang?: Lang; n?: number }>().catch(() => ({}) as { lang?: Lang; n?: number });
  const lang = body.lang && LANGS.includes(body.lang) ? body.lang : undefined;
  const n = typeof body.n === "number" && body.n > 0 ? Math.min(Math.floor(body.n), MAX_PER_LANG) : undefined;
  const fresh = await introduceMore(new Db(c.env.DB), new Date(), { lang, n });
  return c.json({ added: fresh.length, items: fresh.map((i) => ({ id: i.id, text: i.text })) });
});

export const more: Feature = {
  id: "more",
  commands: [
    {
      name: "more",
      description: "Ещё новые слова сейчас (/more es, /more lt 20)",
      run: async (c, args) => {
        const fresh = await introduceMore(c.db, c.now, parseMoreArgs(args));
        if (!fresh.length) return c.tg.sendMessage(c.ownerId, "Новых слов больше нет — нужна следующая партия контента.");
        const text = [`➕ <b>Ещё ${fresh.length} новых</b> — уже в карточках:`, "", ...fresh.map(formatNewItem)].join("\n");
        return c.tg.sendMessage(c.ownerId, text, learnButton(c.webAppUrl));
      },
    },
  ],
  api,
};
