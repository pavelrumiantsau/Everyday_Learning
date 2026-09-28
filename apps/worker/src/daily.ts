import { buildQuiz, formatNewItem, inWindow, langOf, localClock, newCard, pickNewItems, type CardJson, type Item } from "@el/core";
import { ITEM_BY_ID, ITEMS, SCHEDULE } from "./content";
import type { Db } from "./db";
import type { Telegram } from "./telegram";

const MORNING_WINDOW_MIN = 180; // if the morning cron is missed, still send until 3 h later
const EVENING_WINDOW_MIN = 120;

export type CardKind = "recog" | "forms";
export const cardIdFor = (itemId: string, kind: CardKind = "recog") => `${itemId}:${kind}`;

/** Cards to create when an item is introduced: meaning, plus principal forms for verbs that have them. */
export function cardsForItem(item: Item): CardKind[] {
  return item.forms ? ["recog", "forms"] : ["recog"];
}

/** Adds cards that should exist but don't (e.g. forms cards for verbs learned before forms were added). */
export async function ensureCards(db: Db, now = new Date()): Promise<number> {
  const [introduced, existing] = await Promise.all([db.introducedItemIds(), db.cardIds()]);
  const missing = [...introduced].flatMap((id) => {
    const item = ITEM_BY_ID.get(id);
    return item ? cardsForItem(item).filter((k) => !existing.has(cardIdFor(id, k))).map((k) => ({ item, k })) : [];
  });
  if (missing.length) {
    await db.batch(missing.map(({ item, k }) => db.insertCard(cardIdFor(item.id, k), item.id, langOf(item), newCard(now), now.getTime())));
  }
  return missing.length;
}

/** Called by the 15-minute cron. */
export async function tick(db: Db, tg: Telegram, chatId: string, webAppUrl: string, now = new Date()): Promise<string> {
  const { day, hhmm } = localClock(now, SCHEDULE.timezone);

  if (inWindow(hhmm, SCHEDULE.morning, MORNING_WINDOW_MIN) && (await db.claimDayFlag(day, "morning_sent"))) {
    await sendMorning(db, tg, chatId, webAppUrl, now);
    return "morning";
  }

  if (inWindow(hhmm, SCHEDULE.evening, EVENING_WINDOW_MIN)) {
    const today = await db.getDay(day);
    if (today.reviews === 0 && !today.evening_sent && (await db.claimDayFlag(day, "evening_sent"))) {
      await tg.sendMessage(chatId, "🔥 Ещё не занимался сегодня. 2 минуты — ответь на квизы выше или открой карточки.", learnButton(webAppUrl));
      return "evening";
    }
  }
  return "idle";
}

export const learnButton = (url: string) => ({ text: "▶ Карточки", url });

export async function sendMorning(db: Db, tg: Telegram, chatId: string, webAppUrl: string, now = new Date()): Promise<void> {
  const { day } = localClock(now, SCHEDULE.timezone);
  const introduced = await db.introducedItemIds();
  const fresh = pickNewItems(ITEMS, introduced, SCHEDULE.new_per_day);
  await ensureCards(db, now);
  const due = await db.dueCards(now.getTime(), SCHEDULE.max_review_polls, "recog"); // polls test meanings only

  const lines = [`☀️ <b>Labas rytas!</b> Сегодня: ${fresh.length} новых, ${due.length} на повторение.`];
  if (fresh.length) lines.push("", ...fresh.map(formatNewItem));
  else lines.push("", "Новых слов пока нет — нужна следующая партия контента.");
  await tg.sendMessage(chatId, lines.join("\n"), learnButton(webAppUrl));

  // Introduce the new items as cards (due now, so their quiz below counts as the first review).
  const at = now.getTime();
  if (fresh.length) {
    await db.batch([
      ...fresh.flatMap((item) => cardsForItem(item).map((k) => db.insertCard(cardIdFor(item.id, k), item.id, langOf(item), newCard(now), at))),
      db.bumpDay(day, "new_cards", fresh.length),
    ]);
  }

  const quizCards = [...fresh.map((i) => cardIdFor(i.id)), ...due.map((c) => c.card_id)];
  for (const cardId of new Set(quizCards)) {
    const item = ITEM_BY_ID.get(cardId.split(":")[0]!);
    if (!item) continue; // item removed from content
    const quiz = buildQuiz(item, ITEMS);
    if (quiz.options.length < 2) continue;
    const sent = await tg.sendQuiz(chatId, quiz);
    await db.mapPoll(sent.poll.id, cardId, quiz.correctIndex, Date.now()).run();
  }
}

export type { CardJson };
