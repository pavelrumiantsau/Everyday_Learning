import { buildQuiz, formatNewItem, inWindow, langOf, localClock, newCard, pickNewItems, type CardJson } from "@el/core";
import { ITEM_BY_ID, ITEMS, SCHEDULE } from "./content";
import type { Db } from "./db";
import type { Telegram } from "./telegram";

const MORNING_WINDOW_MIN = 180; // if the morning cron is missed, still send until 3 h later
const EVENING_WINDOW_MIN = 120;

export const cardIdFor = (itemId: string) => `${itemId}:recog`;

/** Called by the 15-minute cron. */
export async function tick(db: Db, tg: Telegram, chatId: string, now = new Date()): Promise<string> {
  const { day, hhmm } = localClock(now, SCHEDULE.timezone);

  if (inWindow(hhmm, SCHEDULE.morning, MORNING_WINDOW_MIN) && (await db.claimDayFlag(day, "morning_sent"))) {
    await sendMorning(db, tg, chatId, now);
    return "morning";
  }

  if (inWindow(hhmm, SCHEDULE.evening, EVENING_WINDOW_MIN)) {
    const today = await db.getDay(day);
    if (today.reviews === 0 && !today.evening_sent && (await db.claimDayFlag(day, "evening_sent"))) {
      await tg.sendMessage(chatId, "🔥 Ещё не занимался сегодня. 2 минуты — ответь на квизы выше или напиши /today.");
      return "evening";
    }
  }
  return "idle";
}

export async function sendMorning(db: Db, tg: Telegram, chatId: string, now = new Date()): Promise<void> {
  const { day } = localClock(now, SCHEDULE.timezone);
  const introduced = await db.introducedItemIds();
  const fresh = pickNewItems(ITEMS, introduced, SCHEDULE.new_per_day);
  const due = await db.dueCards(now.getTime(), SCHEDULE.max_review_polls);

  const lines = [`☀️ <b>Labas rytas!</b> Сегодня: ${fresh.length} новых, ${due.length} на повторение.`];
  if (fresh.length) lines.push("", ...fresh.map(formatNewItem));
  else lines.push("", "Новых слов пока нет — нужна следующая партия контента.");
  await tg.sendMessage(chatId, lines.join("\n"));

  // Introduce the new items as cards (due now, so their quiz below counts as the first review).
  const at = now.getTime();
  if (fresh.length) {
    await db.batch([
      ...fresh.map((item) => db.insertCard(cardIdFor(item.id), item.id, langOf(item), newCard(now), at)),
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
