import { buildQuiz, formatNewItem, inWindow, langOf, localClock, newCard, pickNewItems, type CardJson, type Item } from "@el/core";
import { ITEM_BY_ID, ITEMS, SCHEDULE } from "./content";
import { getPrefs } from "./prefs";
import type { Db } from "./db";
import type { BotContext } from "./feature";
import type { Telegram } from "./telegram";

const MORNING_WINDOW_MIN = 180; // if the morning cron is missed, still send until 3 h later
const EVENING_WINDOW_MIN = 120;

export type CardKind = "recog" | "forms" | "prod";
export const cardIdFor = (itemId: string, kind: CardKind = "recog") => `${itemId}:${kind}`;

/** Cards to create when an item is introduced: meaning, plus principal forms for verbs that have them. */
export function cardsForItem(item: Item): CardKind[] {
  return item.forms ? ["recog", "forms"] : ["recog"];
}

/** Creates the cards of new items (due now) and counts them as today's new cards. Used by the morning lesson and /more. */
export async function introduceItems(db: Db, items: readonly Item[], now: Date): Promise<void> {
  if (!items.length) return;
  const { day } = localClock(now, SCHEDULE.timezone);
  const at = now.getTime();
  await db.batch([
    ...items.flatMap((item) => cardsForItem(item).map((k) => db.insertCard(cardIdFor(item.id, k), item.id, langOf(item), newCard(now), at))),
    db.bumpDay(day, "new_cards", items.length),
  ]);
}

/** A meaning card is "known" once it has been answered correctly at least twice and is in review (FSRS state 2). */
const REVERSE_AFTER_REPS = 2;

/**
 * Adds cards that should exist but don't: forms cards for verbs learned before forms were added, and
 * reverse (meaning → word) cards once the meaning card is known, for languages where reverse cards are on.
 */
export async function ensureCards(db: Db, now = new Date()): Promise<number> {
  const [introduced, existing, recog, prefs] = await Promise.all([db.introducedItemIds(), db.cardIds(), db.recogStates(), getPrefs(db)]);
  const knownMeaning = new Set(
    recog
      .filter((r) => {
        const c = JSON.parse(r.fsrs) as { reps?: number; state?: number };
        return (c.reps ?? 0) >= REVERSE_AFTER_REPS && c.state === 2;
      })
      .map((r) => r.item_id),
  );
  const missing = [...introduced].flatMap((id) => {
    const item = ITEM_BY_ID.get(id);
    if (!item) return [];
    const kinds: CardKind[] = [...cardsForItem(item)];
    if (prefs.reverse[langOf(item)] && knownMeaning.has(id)) kinds.push("prod");
    return kinds.filter((k) => !existing.has(cardIdFor(id, k))).map((k) => ({ item, k }));
  });
  if (missing.length) {
    await db.batch(missing.map(({ item, k }) => db.insertCard(cardIdFor(item.id, k), item.id, langOf(item), newCard(now), now.getTime())));
  }
  return missing.length;
}

/** Called by the 15-minute cron: morning lesson, evening reminder, then each feature's onTick. */
export async function tick(ctx: BotContext): Promise<string> {
  const core = await coreTick(ctx.db, ctx.tg, ctx.ownerId, ctx.webAppUrl, ctx.now);
  if (core === "paused") return core; // holiday: no feature sends anything either
  const done = [core];
  const { FEATURES } = await import("./features");
  for (const f of FEATURES) {
    try {
      const r = await f.onTick?.(ctx);
      if (r) done.push(`${f.id}:${r}`);
    } catch (err) {
      console.error(`tick ${f.id} failed`, err); // one feature's failure must not stop the others
    }
  }
  return done.join(" ");
}

async function coreTick(db: Db, tg: Telegram, chatId: string, webAppUrl: string, now: Date): Promise<string> {
  const { day, hhmm } = localClock(now, SCHEDULE.timezone);
  const [prefs, today] = await Promise.all([getPrefs(db), db.getDay(day)]);
  if (today.paused) return "paused";

  if (inWindow(hhmm, prefs.morning, MORNING_WINDOW_MIN) && (await db.claimDayFlag(day, "morning_sent"))) {
    await sendMorning(db, tg, chatId, webAppUrl, now);
    return "morning";
  }

  if (inWindow(hhmm, prefs.evening, EVENING_WINDOW_MIN)) {
    const left = prefs.min_day_answers - today.reviews;
    if (left > 0 && !today.evening_sent && (await db.claimDayFlag(day, "evening_sent"))) {
      const text =
        today.reviews === 0
          ? "🔥 Ещё не занимался сегодня. 5 минут в карточках — и день засчитан."
          : `🔥 До зачёта дня осталось ${left} ответов — пара минут в карточках.`;
      await tg.sendMessage(chatId, text, learnButton(webAppUrl));
      return "evening";
    }
  }
  return "idle";
}

export const learnButton = (url: string) => ({ text: "▶ Карточки", url });
/** Opens «Учить новые слова» in the Mini App (Mini App deep link ?screen=learn). */
export const newWordsButton = (url: string) => ({ text: "🆕 Учить новые слова", url: `${url}?screen=learn` });

export async function sendMorning(db: Db, tg: Telegram, chatId: string, webAppUrl: string, now = new Date()): Promise<void> {
  const [introduced, prefs] = await Promise.all([db.introducedItemIds(), getPrefs(db)]);
  const fresh = pickNewItems(ITEMS, introduced, prefs.new_per_day);
  await ensureCards(db, now);
  const due = await db.dueCards(now.getTime(), prefs.max_review_polls, "recog"); // polls test meanings only
  const dueTotal = await db.countDue(now.getTime());

  const lines = [`☀️ <b>Labas rytas!</b> Сегодня: ${fresh.length} новых, ${dueTotal} на повторение.`];
  if (fresh.length) lines.push("", ...fresh.map(formatNewItem));
  else lines.push("", "Новых слов пока нет — нужна следующая партия контента.");
  if (fresh.length > prefs.max_new_polls) lines.push("", `Квизы ниже — по первым ${prefs.max_new_polls} словам, остальные — в карточках ▶`);
  await tg.sendMessage(chatId, lines.join("\n"), fresh.length ? newWordsButton(webAppUrl) : learnButton(webAppUrl));

  // Introduce the new items as cards (due now, so their quiz below counts as the first review).
  await introduceItems(db, fresh, now);

  const quizCards = [...fresh.slice(0, prefs.max_new_polls).map((i) => cardIdFor(i.id)), ...due.map((c) => c.card_id)];
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
