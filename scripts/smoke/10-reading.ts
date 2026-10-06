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

  const a1 = await json<{ source: string; lemma: string; meaning: string }>(postJson("/reading/lookup", { lang: "lt", word: "eurų", sentence: "mokame šešis šimtus eurų", textId: "lt-r-0001" }));
  const aiCalls = llm.requests.length;
  const a2 = await json<{ source: string }>(postJson("/reading/lookup", { lang: "lt", word: "Eurų", sentence: "…", textId: "lt-r-0001" }));
  check(a1.source === "ai" && a1.lemma === "euras" && a1.meaning === "евро" && aiCalls >= 1, "an unknown word is looked up by the AI");
  check(a2.source === "cache" && llm.requests.length === aiCalls, "the second lookup comes from the cache, no AI call");

  const add = await json<{ itemId: string }>(postJson("/reading/cards", { lang: "lt", lemma: "euras", pos: "noun", gender: "m", gen: "euro", meaning: "евро", example: "Kas mėnesį mokame šešis šimtus eurų." }));
  const q = await json<{ cards: { cardId: string; item?: { text: string; gen?: string } }[] }>(api("/learn?limit=100", me));
  check(/^u-lt-\d{6}$/.test(add.itemId) && q.cards.some((c) => c.cardId === `${add.itemId}:recog` && c.item?.gen === "euro"), "a looked-up word becomes a card in «Учить новые слова»");
  const again = await json<{ added: boolean }>(postJson("/reading/lookup", { lang: "lt", word: "eurų", sentence: "…", textId: "lt-r-0001" }));
  check(again.added === true, "the lookup then shows the word as already in the cards");
  const course = await json<{ itemId: string }>(postJson("/reading/cards", { lang: "lt", lemma: "pavojus", meaning: "опасность", example: "…" }));
  check(course.itemId === "lt-w-0017", "a word the course already has uses the course's own card (with its example and audio)");

  const done = await json<{ ok: boolean; nextLevel: string }>(postJson("/reading/texts/lt-r-0001/done", { correct: 3, total: 3, rating: "easy" }));
  check(done.ok && done.nextLevel === "B2", "a text can be marked as read; «легко» on a B1 text asks for B2 next");

  // Own texts: pasted in the Mini App, stored only in D1, questions by the AI on first open.
  const article = "Vilniuje šiandien vyko didelis koncertas. ".repeat(8) + "Žmonės dainavo ir šoko iki vėlyvo vakaro, o miestas buvo pilnas svečių.";
  check((await postJson("/reading/own", { lang: "lt", text: "Per trumpas tekstas." })).status === 400, "a too short own text is rejected");
  const own = await json<{ id: string; words: number }>(postJson("/reading/own", { lang: "lt", text: article, url: "https://www.lrt.lt/naujienos/test" }));
  check(/^u-r-\d{6}$/.test(own.id) && own.words > 30, "an own text is saved");
  const list = await json<{ own: { id: string; title: string; topic: string }[]; level: string }>(api("/reading", me));
  check(list.own.some((t) => t.id === own.id && t.title.startsWith("Vilniuje") && t.topic.includes("lrt.lt")) && list.level === "B2",
    "the reading list shows own texts (title from the first words, source site) and the next level");
  llm.requests.length = 0;
  const opened = await json<{ text: { questions: { options: string[] }[]; own?: boolean } }>(api(`/reading/texts/${own.id}`, me));
  const firstCalls = llm.requests.length;
  await api(`/reading/texts/${own.id}`, me);
  check(opened.text.own === true && opened.text.questions.length === 3 && firstCalls >= 1 && llm.requests.length === firstCalls,
    "an own text gets 3 AI questions on first open, stored for later");
  const w = await json<{ source: string }>(postJson("/reading/lookup", { lang: "lt", word: "koncertas", sentence: "Vilniuje vyko koncertas.", textId: own.id }));
  check(w.source === "ai" || w.source === "cache", "words in an own text are looked up like any other");
  check((await postJson(`/reading/texts/${own.id}/done`, { correct: 2, total: 3, rating: "hard" })).ok, "an own text can be marked as read with a rating");
  check((await api(`/reading/own/${own.id}`, me, { method: "DELETE" })).ok && (await api(`/reading/texts/${own.id}`, me)).status === 404, "an own text can be deleted");
  calls.length = 0;
  await post(msg("/read"));
  const m = calls.find((c) => c.method === "sendMessage");
  check(!!m && String(m.body.text).includes("Текст дня") && m.body.text.includes("Nuotolinis darbas") && m.body.text.includes("B2") && String(m.body.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url).includes("screen=reading"),
    "/read sends the next unread text at the learner's level (B2 after «легко») with a button that opens it");
}
