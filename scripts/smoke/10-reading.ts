import type { Smoke } from "./context.ts";

// Reading mode: texts, glossary and AI word lookup (cached), adding words to cards, /read.
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls, llm } = t;
  const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;
  const postJson = (path: string, body: object) => api(path, me, { method: "POST", body: JSON.stringify(body) });

  const { texts } = await json<{ texts: { id: string; lang: string; read: boolean; words: number }[] }>(api("/reading", me));
  check(texts.length >= 6 && texts[0]!.lang === "lt" && texts.every((x) => !x.read && x.words > 50), `the reading list has ${texts.length} texts, Lithuanian first`);
  const one = await json<{ text: { id: string; text: string; questions: unknown[] } }>(api("/reading/texts/lt-r-0001", me));
  check(one.text.questions.length === 3 && one.text.text.includes("išsinuomojome"), "a text opens with its 3 questions");

  llm.requests.length = 0;
  const g = await json<{ source: string; lemma: string; forms?: { past: string } }>(postJson("/reading/lookup", { lang: "lt", word: "Persikraustyti", sentence: "Persikraustyti nebuvo lengva.", textId: "lt-r-0001" }));
  check(g.source === "glossary" && g.lemma === "persikraustyti" && g.forms?.past === "persikraustė" && llm.requests.length === 0, "a glossary word is explained without calling the AI");

  const a1 = await json<{ source: string; lemma: string; meaning: string }>(postJson("/reading/lookup", { lang: "lt", word: "butą", sentence: "išsinuomojome naują butą", textId: "lt-r-0001" }));
  const aiCalls = llm.requests.length;
  const a2 = await json<{ source: string }>(postJson("/reading/lookup", { lang: "lt", word: "Butą", sentence: "…", textId: "lt-r-0001" }));
  check(a1.source === "ai" && a1.lemma === "butas" && a1.meaning === "квартира" && aiCalls >= 1, "an unknown word is looked up by the AI");
  check(a2.source === "cache" && llm.requests.length === aiCalls, "the second lookup comes from the cache, no AI call");

  const add = await json<{ itemId: string }>(postJson("/reading/cards", { lang: "lt", lemma: "butas", pos: "noun", gender: "m", gen: "buto", meaning: "квартира", example: "Išsinuomojome naują butą." }));
  const q = await json<{ cards: { cardId: string; item?: { text: string; gen?: string } }[] }>(api("/queue?limit=200", me));
  check(/^u-lt-\d{6}$/.test(add.itemId) && q.cards.some((c) => c.cardId === `${add.itemId}:recog` && c.item?.gen === "buto"), "a looked-up word becomes a review card");
  const again = await json<{ added: boolean }>(postJson("/reading/lookup", { lang: "lt", word: "butą", sentence: "…", textId: "lt-r-0001" }));
  check(again.added === true, "the lookup then shows the word as already in the cards");
  const course = await json<{ itemId: string }>(postJson("/reading/cards", { lang: "lt", lemma: "pavojus", meaning: "опасность", example: "…" }));
  check(course.itemId === "lt-w-0017", "a word the course already has uses the course's own card (with its example and audio)");

  check((await postJson("/reading/texts/lt-r-0001/done", { correct: 3, total: 3 })).ok, "a text can be marked as read");
  calls.length = 0;
  await post(msg("/read"));
  const m = calls.find((c) => c.method === "sendMessage");
  check(!!m && String(m.body.text).includes("Текст дня") && m.body.text.includes("Pas gydytoją") && String(m.body.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url).includes("screen=reading"),
    "/read sends the next unread text with a button that opens it");
}
