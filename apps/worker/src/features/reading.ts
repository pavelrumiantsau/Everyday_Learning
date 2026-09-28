// Reading mode: graded texts (content/<lang>/reading), tap a word → glossary or AI lookup (cached) → add it to cards.
// Thursday is Lithuanian reading day (PLAN §3.6): a "📖 Текст дня" message in the learner's morning window; /read any time.
import {
  escapeHtml,
  inWindow,
  isReadingDay,
  learnerItemId,
  localClock,
  newCard,
  normalizeWord,
  parseLearnerItemId,
  pickText,
  wordsOf,
  type Item,
  type Lang,
  type ReadingText,
} from "@el/core";
import { PROFILES, type TargetLang } from "@el/llm";
import { Hono } from "hono";
import { z } from "zod";
import { ITEM_BY_ID, ITEMS, SCHEDULE, TEXT_BY_ID, TEXTS } from "../content";
import { cardIdFor, cardsForItem } from "../daily";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { getPrefs } from "../prefs";
import { llmRouter, PROMPTS } from "./ai/llm";
import { AiStore } from "./ai/store";

const LANGS: Lang[] = ["lt", "es", "fr"];
const FLAG: Record<Lang, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };
const MORNING_WINDOW_MIN = 180;

const Lookup = z.object({
  lemma: z.string().min(1),
  pos: z.enum(["noun", "verb", "adj", "adv", "pron", "prep", "conj", "num", "part", "phrase"]).optional().catch(undefined),
  meaning: z.string().min(1),
  gender: z.enum(["m", "f", "n", "mf"]).optional().catch(undefined),
  gen: z.string().min(1).optional().catch(undefined),
  forms: z.object({ pres: z.string().min(1), past: z.string().min(1) }).optional().catch(undefined),
  note: z.string().optional().catch(undefined),
});
type Lookup = z.infer<typeof Lookup>;

async function readIds(d1: D1Database): Promise<Set<string>> {
  const { results } = await d1.prepare("SELECT text_id FROM reading_done").all<{ text_id: string }>();
  return new Set(results.map((r) => r.text_id));
}

/** A content word with this dictionary form, if the course already has it. */
const contentItem = (lang: Lang, lemma: string) => ITEMS.find((i) => i.id.startsWith(`${lang}-`) && normalizeWord(i.text) === normalizeWord(lemma));

async function learnerItemByLemma(d1: D1Database, lang: Lang, lemma: string) {
  return d1.prepare("SELECT n FROM learner_item WHERE lang = ? AND lemma = ?").bind(lang, normalizeWord(lemma)).first<{ n: number }>();
}

async function isAdded(db: Db, d1: D1Database, lang: Lang, lemma: string): Promise<boolean> {
  const it = contentItem(lang, lemma);
  if (it) return (await db.getCard(cardIdFor(it.id))) !== null;
  return (await learnerItemByLemma(d1, lang, lemma)) !== null;
}

/** Learner items (words added from reading) as Item-compatible objects, for the review queue. */
export async function learnerItems(d1: D1Database, itemIds: string[]): Promise<Map<string, Item>> {
  const ns = itemIds.map(parseLearnerItemId).filter((x) => x !== null).map((x) => x.n);
  if (!ns.length) return new Map();
  const { results } = await d1
    .prepare(`SELECT n, lang, data FROM learner_item WHERE n IN (${ns.map(() => "?").join(",")})`)
    .bind(...ns)
    .all<{ n: number; lang: Lang; data: string }>();
  return new Map(
    results.map((r) => {
      const id = learnerItemId(r.lang, r.n);
      return [id, { ...(JSON.parse(r.data) as Omit<Item, "id">), id } as Item];
    }),
  );
}

const summary = (t: ReadingText, read: Set<string>) => ({
  id: t.id,
  lang: t.id.slice(0, 2) as Lang,
  cefr: t.cefr,
  title: t.title,
  topic: t.topic,
  words: wordsOf(t.text).length,
  read: read.has(t.id),
});

async function sendText(c: BotContext, t: ReadingText) {
  const lang = t.id.slice(0, 2) as Lang;
  return c.tg.sendMessage(
    c.ownerId,
    `📖 <b>Текст дня</b> ${FLAG[lang]} ${t.cefr}\n<b>${escapeHtml(t.title)}</b> — ${escapeHtml(t.topic)}, ${wordsOf(t.text).length} слов.\n` +
      "Нажимай на незнакомые слова — покажу значение и добавлю в карточки.",
    { text: "📖 Читать", url: `${c.webAppUrl}?screen=reading` },
  );
}

const api = new Hono<{ Bindings: Env }>();

api.get("/reading", async (c) => {
  const read = await readIds(c.env.DB);
  const list = [...TEXTS].sort((a, b) => LANGS.indexOf(a.id.slice(0, 2) as Lang) - LANGS.indexOf(b.id.slice(0, 2) as Lang) || a.id.localeCompare(b.id));
  return c.json({ texts: list.map((t) => summary(t, read)) });
});

api.get("/reading/texts/:id", async (c) => {
  const t = TEXT_BY_ID.get(c.req.param("id"));
  if (!t) return c.json({ error: "unknown text" }, 404);
  return c.json({ text: t, read: (await readIds(c.env.DB)).has(t.id) });
});

api.post("/reading/texts/:id/done", async (c) => {
  const t = TEXT_BY_ID.get(c.req.param("id"));
  if (!t) return c.json({ error: "unknown text" }, 404);
  const b = await c.req.json<{ correct?: number; total?: number }>().catch(() => ({}) as { correct?: number; total?: number });
  await c.env.DB.prepare("INSERT OR REPLACE INTO reading_done (text_id, done_at, correct, total) VALUES (?, ?, ?, ?)")
    .bind(t.id, Date.now(), Number.isInteger(b.correct) ? b.correct : null, Number.isInteger(b.total) ? b.total : null)
    .run();
  return c.json({ ok: true });
});

api.post("/reading/lookup", async (c) => {
  const b = await c.req.json<{ lang?: string; word?: string; sentence?: string; textId?: string }>().catch(() => ({}) as Record<string, never>);
  const lang = b.lang as Lang;
  if (!LANGS.includes(lang) || !b.word || b.word.length > 60) return c.json({ error: "lang and word required" }, 400);
  const db = new Db(c.env.DB);
  const key = normalizeWord(b.word);

  // 1) the text's own glossary (no AI call)
  const g = b.textId ? TEXT_BY_ID.get(b.textId)?.glossary.find((e) => normalizeWord(e.word) === key) : undefined;
  if (g) {
    const r: Lookup = { lemma: g.lemma, pos: g.pos, meaning: g.meaning, gender: g.gender, gen: g.gen, forms: g.forms, note: g.note };
    const item = g.item ? ITEM_BY_ID.get(g.item) : undefined;
    if (item) Object.assign(r, { pos: r.pos ?? item.pos, gender: r.gender ?? item.gender, gen: r.gen ?? item.gen, forms: r.forms ?? item.forms });
    return c.json({ source: "glossary", ...r, added: await isAdded(db, c.env.DB, lang, r.lemma) });
  }
  // 2) cache
  const cached = await c.env.DB.prepare("SELECT result FROM lookup_cache WHERE lang = ? AND word = ?").bind(lang, key).first<string>("result");
  if (cached) {
    const r = JSON.parse(cached) as Lookup;
    return c.json({ source: "cache", ...r, added: await isAdded(db, c.env.DB, lang, r.lemma) });
  }
  // 3) AI
  const p = PROFILES[lang as TargetLang];
  const system = (PROMPTS["feedback/lookup"] ?? "")
    .replaceAll("{{lang_name}}", p.name)
    .replaceAll("{{explain_lang}}", p.explainIn)
    .replaceAll("{{level}}", p.level);
  try {
    const res = await llmRouter(c.env, new AiStore(c.env.DB)).json(
      "word_lookup",
      { messages: [{ role: "system", content: system }, { role: "user", content: `Word: ${b.word}\nSentence: ${(b.sentence ?? "").slice(0, 400)}` }], temperature: 0, maxTokens: 400 },
      Lookup,
    );
    const r: Lookup = res.output;
    if (lang !== "lt") delete r.gen, delete r.forms; // only Lithuanian dictionary forms are shown
    await c.env.DB.prepare("INSERT OR REPLACE INTO lookup_cache (lang, word, result, created_at) VALUES (?, ?, ?, ?)")
      .bind(lang, key, JSON.stringify(r), Date.now())
      .run();
    return c.json({ source: "ai", ...r, added: await isAdded(db, c.env.DB, lang, r.lemma) });
  } catch (err) {
    console.error("lookup failed", String(err).slice(0, 200));
    return c.json({ error: "Не получилось найти слово — попробуй ещё раз позже." }, 502);
  }
});

api.post("/reading/cards", async (c) => {
  const b = await c.req.json<Partial<Lookup> & { lang?: string; example?: string }>().catch(() => ({}) as Record<string, never>);
  const lang = b.lang as Lang;
  const parsed = Lookup.safeParse(b);
  if (!LANGS.includes(lang) || !parsed.success) return c.json({ error: "lang, lemma and meaning required" }, 400);
  const db = new Db(c.env.DB);
  const now = new Date();
  const at = now.getTime();

  // A word the course already has: introduce the course's own cards (with its Tatoeba example, audio…).
  const existing = contentItem(lang, parsed.data.lemma);
  if (existing) {
    if ((await db.getCard(cardIdFor(existing.id))) === null) {
      await db.batch(cardsForItem(existing).map((k) => db.insertCard(cardIdFor(existing.id, k), existing.id, lang, newCard(now), at)));
    }
    return c.json({ added: true, itemId: existing.id });
  }

  const r = parsed.data;
  const expl = lang === "lt" ? "ru" : "en";
  const data: Omit<Item, "id"> = {
    type: r.pos === "phrase" ? "phrase" : "word",
    cefr: "B1",
    text: r.lemma,
    ...(r.pos && { pos: r.pos }),
    ...(r.gender && { gender: r.gender }),
    ...(lang === "lt" && r.pos === "verb" && r.forms && { forms: r.forms }),
    ...(lang === "lt" && r.pos === "noun" && r.gen && { gen: r.gen }),
    meaning: { [expl]: r.meaning },
    examples: b.example ? [{ text: b.example.slice(0, 300), translation: "", source: "generated" }] : [],
    tags: ["from-reading"],
  };
  const ins = await c.env.DB.prepare("INSERT OR IGNORE INTO learner_item (lang, lemma, data, created_at) VALUES (?, ?, ?, ?)")
    .bind(lang, normalizeWord(r.lemma), JSON.stringify(data), at)
    .run();
  const row = await learnerItemByLemma(c.env.DB, lang, r.lemma);
  if (!row) return c.json({ error: "not saved" }, 500);
  const id = learnerItemId(lang, row.n);
  if (ins.meta.changes === 1) {
    const kinds = data.forms ? (["recog", "forms"] as const) : (["recog"] as const);
    await db.batch(kinds.map((k) => db.insertCard(cardIdFor(id, k), id, lang, newCard(now), at)));
  }
  return c.json({ added: true, itemId: id });
});

export const reading: Feature = {
  id: "reading",
  commands: [
    {
      name: "read",
      description: "Текст для чтения",
      run: async (c) => {
        const t = pickText(TEXTS, await readIds(c.env.DB));
        return t ? sendText(c, t) : c.tg.sendMessage(c.ownerId, "📖 Все тексты прочитаны — новые придут со следующей партией.");
      },
    },
  ],
  api,
  async onTick(c) {
    const { day, hhmm } = localClock(c.now, SCHEDULE.timezone);
    if (!isReadingDay(day) || !inWindow(hhmm, (await getPrefs(c.db)).morning, MORNING_WINDOW_MIN)) return;
    const t = pickText(TEXTS, await readIds(c.env.DB), "lt");
    if (!t) return;
    const claimed = await c.env.DB.prepare("INSERT OR IGNORE INTO reading_day (day, text_id, sent_at) VALUES (?, ?, ?)").bind(day, t.id, Date.now()).run();
    if (claimed.meta.changes !== 1) return;
    await sendText(c, t);
    return t.id;
  },
};
