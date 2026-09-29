import { plain, type Smoke } from "./context.ts";

// Mini App: page, login, review queue, answers, verb forms cards, noun genitives.
export default async function (t: Smoke) {
  const { check, base, api, initData, me, OWNER } = t;
  const { lesson, polls } = t.state as { lesson: any; polls: any[] };
  // --- Mini App ---
  const html = await (await fetch(`${base}/`)).text();
  check(html.includes("telegram-web-app.js"), "the Mini App page is served at /");
  check(!!lesson?.body.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url, "the lesson message has a button that opens the Mini App");


  check((await api("/session", null)).status === 401, "API without Telegram data → 401");
  check((await api("/session", await initData(Number(OWNER), "wrong-token"))).status === 401, "API with a forged signature → 401");
  check((await api("/session", await initData(999))).status === 403, "API for another Telegram user → 403");

  const session = (await (await api("/session", me)).json()) as { due: number; reviewsToday: number };
  check(session.due > 0 && session.reviewsToday === 2, `session: ${session.due} due, ${session.reviewsToday} answers today`);
  const { cards } = (await (await api("/queue", me)).json()) as { cards: { cardId: string; item: { text: string } }[] };
  check(cards.length === session.due && !!cards[0]?.item.text, `queue returns the ${cards.length} due cards with their content`);
  const formsCard = cards.find((c) => c.cardId === "lt-w-0005:forms") as { item: { text: string; forms?: { pres: string; past: string } } } | undefined;
  check(formsCard?.item.text === "vėluoti" && formsCard.item.forms?.past === "vėlavo", "a verb gets a separate 3-forms card (vėluoti → vėluoja, vėlavo)");
  check(plain(String(lesson?.body.text ?? "")).includes("vėluoti, vėluoja, vėlavo"), "the morning lesson shows the verb's 3 forms");
  check(plain(String(lesson?.body.text ?? "")).includes("laikas, laiko") && String(lesson?.body.text).includes("сущ., м. р."), "nouns show nominative + genitive and a readable label");
  check(polls.every((p) => !String(p.body.question).includes(",")), "quiz polls stay on meanings (no forms polls)");

  const review = { id: crypto.randomUUID(), cardId: cards[0]!.cardId, rating: 3, reviewedAt: Date.now() };
  const postReviews = (reviews: object[]) => api("/reviews", me, { method: "POST", body: JSON.stringify({ reviews }) }).then((r) => r.json()) as Promise<{ applied: number }>;
  check((await postReviews([review])).applied === 1, "a flashcard answer is saved");
  check((await postReviews([review])).applied === 0, "the same answer sent twice is saved once");
  const after = (await (await api("/session", me)).json()) as { due: number; reviewsToday: number };
  check(after.reviewsToday === 3 && after.due === session.due - 1, "answer counted, card no longer due");

}
