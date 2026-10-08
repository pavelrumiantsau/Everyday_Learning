// Reading mode: graded texts (content/<lang>/reading), tap a word → glossary or AI lookup (cached) → add it to cards.
// Thursday is Lithuanian reading day (PLAN §3.6): a "📖 Текст дня" message in the learner's morning window; /read any time.
// A colleague's copy reads in its main language on the day its week plan says (packages/core/src/profile.ts).
import {
  chosenLangs,
  escapeHtml,
  firstReadingLevel,
  inWindow,
  learnerItemId,
  localClock,
  newCard,
  nextReadingLevel,
  normalizeWord,
  ownTextId,
  parseLearnerItemId,
  parseOwnTextId,
  pickText,
  readingLangForDay,
  visibleTo,
  READING_RATINGS,
  wordsOf,
  type ReadingRating,
  type Item,
  type Lang,
  type ReadingText,
} from "@el/core";
import { type TargetLang } from "@el/llm";
import { Hono } from "hono";
import { z } from "zod";
import { ITEM_BY_ID, ITEMS, TEXT_BY_ID, TEXTS } from "../content";
import { cardIdFor, cardsForItem } from "../daily";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { getPrefs } from "../prefs";
import { llmRouter, PROMPTS } from "./ai/llm";
import { AiStore } from "./ai/store";
import { aiProfile, currentProfile, learnerItems as courseItems, timezone } from "../profile";

/** Course texts this learner can get (foundation texts only on that course). */
const texts = () => visibleTo(TEXTS, currentProfile());
/** The language of «Текст дня» and /read: Lithuanian in the original plan, else the main language. */
const mainLang = (): Lang => currentProfile()?.main ?? "lt";

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
const contentItem = (lang: Lang, lemma: string) => courseItems().find((i) => i.id.startsWith(`${lang}-`) && normalizeWord(i.text) === normalizeWord(lemma));

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

// --- texts the learner pasted (migration 0010): private, D1 only ---

const OWN_MAX_CHARS = 20_000;
const OWN_MIN_WORDS = 30;
const Questions = z.object({
  questions: z
    .array(z.object({ q: z.string().min(1), options: z.array(z.string().min(1)).min(2).max(4), answer: z.number().int().min(0) }))
    .length(3)
    .refine((qs) => qs.every((q) => q.answer < q.options.length), "answer out of range"),
});
type OwnRow = { n: number; lang: Lang; title: string; text: string; source_url: string | null; questions: string | null; created_at: number };

async function ownRow(d1: D1Database, id: string): Promise<OwnRow | null> {
  const n = parseOwnTextId(id);
  return n === null ? null : d1.prepare("SELECT * FROM own_text WHERE n = ?").bind(n).first<OwnRow>();
}

/** An own text in the shape of a content text (no level, no glossary; topic = where it came from). */
type OwnText = Omit<ReadingText, "cefr"> & { cefr: null; own: true; lang: Lang };
function ownText(r: OwnRow): OwnText {
  let host = "";
  try {
    host = r.source_url ? new URL(r.source_url).hostname.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }
  return {
    id: ownTextId(r.n),
    lang: r.lang,
    own: true,
    cefr: null,
    title: r.title,
    topic: host ? `свой текст · ${host}` : "свой текст",
    source: r.source_url ?? "generated",
    text: r.text,
    glossary: [],
    questions: r.questions ? (JSON.parse(r.questions) as ReadingText["questions"]) : [],
  };
}

/** 3 questions for an own text: generated once by the AI and stored; [] if the AI is unavailable (the quiz is skipped). */
async function ensureQuestions(env: Env, r: OwnRow): Promise<OwnRow> {
  if (r.questions) return r;
  const p = aiProfile(r.lang as TargetLang);
  const system = (PROMPTS["feedback/reading-questions"] ?? "").replaceAll("{{lang_name}}", p.name).replaceAll("{{level}}", p.level);
  try {
    const res = await llmRouter(env, new AiStore(env.DB)).json(
      "reading_questions",
      { messages: [{ role: "system", content: system }, { role: "user", content: r.text.slice(0, 12_000) }], temperature: 0.2, maxTokens: 900 },
      Questions,
    );
    const questions = JSON.stringify(res.output.questions);
    await env.DB.prepare("UPDATE own_text SET questions = ? WHERE n = ?").bind(questions, r.n).run();
    return { ...r, questions };
  } catch (err) {
    console.error("reading questions failed", String(err).slice(0, 200));
    return r;
  }
}

/** Level of the next text of `lang` from the learner's last rated course text (own texts have no level). */
async function targetLevel(d1: D1Database, lang: Lang) {
  const { results } = await d1
    .prepare("SELECT text_id, rating FROM reading_done WHERE rating IS NOT NULL AND text_id LIKE ? ORDER BY done_at DESC LIMIT 1")
    .bind(`${lang}-r-%`)
    .all<{ text_id: string; rating: ReadingRating }>();
  const last = results[0];
  const t = last && TEXT_BY_ID.get(last.text_id);
  return t ? nextReadingLevel({ cefr: t.cefr, rating: last.rating }, lang) : firstReadingLevel(lang, currentProfile());
}

async function nextText(d1: D1Database, lang: Lang) {
  return pickText(texts(), await readIds(d1), lang, await targetLevel(d1, lang));
}

const summary = (t: Pick<ReadingText, "id" | "title" | "topic" | "text"> & { cefr: string | null }, read: Set<string>) => ({
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
  const p = currentProfile();
  const list = texts().filter((t) => !p || chosenLangs(p).includes(t.id.slice(0, 2) as Lang)).sort((a, b) => LANGS.indexOf(a.id.slice(0, 2) as Lang) - LANGS.indexOf(b.id.slice(0, 2) as Lang) || a.id.localeCompare(b.id));
  const { results } = await c.env.DB.prepare("SELECT n, lang, title, text, source_url, NULL AS questions, created_at FROM own_text ORDER BY n DESC").all<OwnRow>();
  const own = results.map((r) => ({ ...summary(ownText(r), read), lang: r.lang, own: true }));
  // The level the next "Текст дня" will have, and that text (so the list can start with it).
  const level = await targetLevel(c.env.DB, mainLang());
  const next = pickText(texts(), read, mainLang(), level);
  return c.json({ texts: list.map((t) => summary(t, read)), own, level, nextId: next?.id ?? null });
});

api.get("/reading/texts/:id", async (c) => {
  const id = c.req.param("id");
  const row = await ownRow(c.env.DB, id);
  const t = row ? ownText(await ensureQuestions(c.env, row)) : TEXT_BY_ID.get(id);
  if (!t) return c.json({ error: "unknown text" }, 404);
  return c.json({ text: t, read: (await readIds(c.env.DB)).has(t.id) });
});

api.post("/reading/texts/:id/done", async (c) => {
  const id = c.req.param("id");
  const known = TEXT_BY_ID.has(id) || (await ownRow(c.env.DB, id)) !== null;
  if (!known) return c.json({ error: "unknown text" }, 404);
  const b = await c.req.json<{ correct?: number; total?: number; rating?: string }>().catch(() => ({}) as { correct?: number; total?: number; rating?: string });
  const rating = READING_RATINGS.includes(b.rating as ReadingRating) ? b.rating : null;
  await c.env.DB.prepare("INSERT OR REPLACE INTO reading_done (text_id, done_at, correct, total, rating) VALUES (?, ?, ?, ?, ?)")
    .bind(id, Date.now(), Number.isInteger(b.correct) ? b.correct : null, Number.isInteger(b.total) ? b.total : null, rating)
    .run();
  return c.json({ ok: true, nextLevel: await targetLevel(c.env.DB, (TEXT_BY_ID.get(id)?.id.slice(0, 2) as Lang) ?? "lt") });
});

// Paste a text (an LRT article, a blog post…) to read it with word lookups; questions come on first open.
api.post("/reading/own", async (c) => {
  const b = await c.req.json<{ lang?: string; title?: string; text?: string; url?: string }>().catch(() => ({}) as Record<string, never>);
  const lang = b.lang as Lang;
  const text = (b.text ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!LANGS.includes(lang)) return c.json({ error: "lang lt|es|fr" }, 400);
  if (text.length > OWN_MAX_CHARS) return c.json({ error: `Слишком длинный текст (до ${OWN_MAX_CHARS} символов).` }, 400);
  const words = wordsOf(text);
  if (words.length < OWN_MIN_WORDS) return c.json({ error: `Слишком короткий текст (нужно от ${OWN_MIN_WORDS} слов).` }, 400);
  let url: string | null = null;
  try {
    url = b.url?.trim() ? new URL(b.url.trim()).toString() : null;
  } catch {
    url = null;
  }
  const title = (b.title ?? "").trim().slice(0, 120) || `${words.slice(0, 6).join(" ")}…`;
  const r = await c.env.DB.prepare("INSERT INTO own_text (lang, title, text, source_url, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(lang, title, text, url, Date.now())
    .run();
  return c.json({ id: ownTextId(Number(r.meta.last_row_id)), words: words.length });
});

api.delete("/reading/own/:id", async (c) => {
  const n = parseOwnTextId(c.req.param("id"));
  if (n === null) return c.json({ error: "unknown text" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM own_text WHERE n = ?").bind(n),
    c.env.DB.prepare("DELETE FROM reading_done WHERE text_id = ?").bind(ownTextId(n)),
  ]);
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
  const p = aiProfile(lang as TargetLang);
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
        const t = (await nextText(c.env.DB, mainLang())) ?? pickText(texts(), await readIds(c.env.DB));
        return t ? sendText(c, t) : c.tg.sendMessage(c.ownerId, "📖 Все тексты прочитаны — новые придут со следующей партией.");
      },
    },
  ],
  api,
  async onTick(c) {
    const { day, hhmm } = localClock(c.now, timezone());
    const lang = readingLangForDay(day, currentProfile());
    if (!lang || !inWindow(hhmm, (await getPrefs(c.db)).morning, MORNING_WINDOW_MIN)) return;
    const t = await nextText(c.env.DB, lang);
    if (!t) return;
    const claimed = await c.env.DB.prepare("INSERT OR IGNORE INTO reading_day (day, text_id, sent_at) VALUES (?, ?, ?)").bind(day, t.id, Date.now()).run();
    if (claimed.meta.changes !== 1) return;
    await sendText(c, t);
    return t.id;
  },
};
