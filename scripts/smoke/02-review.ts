import { plain, type Smoke } from "./context.ts";

// Mini App: page, login, «Учить новые слова», review queue, answers, verb forms cards, noun genitives.
export default async function (t: Smoke) {
  const { check, base, api, initData, me, OWNER } = t;
  const { lesson, polls } = t.state as { lesson: any; polls: any[] };
  // --- Mini App ---
  const html = await (await fetch(`${base}/`)).text();
  check(html.includes("telegram-web-app.js"), "the Mini App page is served at /");
  check(!!lesson?.body.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url?.includes("screen=learn"), "the lesson message has a button that opens «Учить новые слова»");


  check((await api("/session", null)).status === 401, "API without Telegram data → 401");
  check((await api("/session", await initData(Number(OWNER), "wrong-token"))).status === 401, "API with a forged signature → 401");
  check((await api("/session", await initData(999))).status === 403, "API for another Telegram user → 403");

  type Session = { due: number; learning: number; reviewsToday: number };
  type Card = { cardId: string; item: { id: string; text: string; forms?: { pres: string; past: string } } };
  const session = (await (await api("/session", me)).json()) as Session;
  check(session.learning > 0 && session.reviewsToday === 2, `session: ${session.learning} new words to learn, ${session.reviewsToday} answers today`);
  const learn = (await (await api("/learn?limit=100", me)).json()) as { cards: Card[]; total: number };
  check(learn.total === session.learning && learn.cards.length === learn.total && learn.cards.every((c) => c.cardId.endsWith(":recog") && !!c.item.text),
    `«Учить новые слова» returns the ${learn.total} new meaning cards with their content`);
  const verb = learn.cards.find((c) => c.item.id === "lt-w-0005");
  check(verb?.item.text === "vėluoti" && verb.item.forms?.past === "vėlavo", "a new verb comes with its 3 forms (vėluoti → vėluoja, vėlavo)");
  const { cards } = (await (await api("/queue", me)).json()) as { cards: Card[] };
  check(cards.length === session.due && !cards.some((c) => learn.cards.some((l) => l.item.id === c.item?.id)),
    "«Повторить» leaves out words that are still being learned (and their 3-forms cards)");
  check(plain(String(lesson?.body.text ?? "")).includes("vėluoti, vėluoja, vėlavo"), "the morning lesson shows the verb's 3 forms");
  check(plain(String(lesson?.body.text ?? "")).includes("laikas, laiko") && String(lesson?.body.text).includes("сущ., м. р."), "nouns show nominative + genitive and a readable label");
  check(polls.every((p) => !String(p.body.question).includes(",")), "quiz polls stay on meanings (no forms polls)");

  const good = () => ({ id: crypto.randomUUID(), cardId: "lt-w-0005:recog", rating: 3, reviewedAt: Date.now() });
  const review = good();
  const postReviews = (reviews: object[]) => api("/reviews", me, { method: "POST", body: JSON.stringify({ reviews }) }).then((r) => r.json()) as Promise<{ applied: number }>;
  check((await postReviews([review])).applied === 1, "a flashcard answer is saved");
  check((await postReviews([review])).applied === 0, "the same answer sent twice is saved once");
  const mid = (await (await api("/session", me)).json()) as Session;
  check(mid.reviewsToday === 3 && mid.learning === session.learning, "one correct answer: the word is still being learned");
  await postReviews([good()]);
  const after = (await (await api("/session", me)).json()) as Session;
  check(after.reviewsToday === 4 && after.learning === session.learning - 1, "two correct answers in a row: the word is learned");
  const q2 = (await (await api("/queue", me)).json()) as { cards: Card[] };
  check(q2.cards.some((c) => c.cardId === "lt-w-0005:forms") && !q2.cards.some((c) => c.cardId === "lt-w-0005:recog"),
    "once its meaning is learned, the verb's 3-forms card comes in «Повторить»; the meaning card is due in a day or two");

}
