import { localClock, reviewQuiz, Rating } from "@el/core";
import { SCHEDULE } from "./content";
import type { Db } from "./db";
import { learnButton, sendMorning } from "./daily";
import type { Telegram, TgUpdate } from "./telegram";

const HELP = [
  "Команды:",
  "/today — план на сегодня",
  "/lesson — получить утренний урок сейчас",
  "/help — эта справка",
].join("\n");

export async function handleUpdate(update: TgUpdate, db: Db, tg: Telegram, ownerId: string, webAppUrl: string, now = new Date()) {
  // Ignore everyone except the owner.
  const fromId = update.message?.from?.id ?? update.poll_answer?.user?.id;
  if (String(fromId) !== ownerId) return;

  if (update.poll_answer) return handlePollAnswer(update.poll_answer.poll_id, update.poll_answer.option_ids, db, now);

  const text = update.message?.text?.trim() ?? "";
  const command = text.startsWith("/") ? text.split(/[\s@]/)[0]!.toLowerCase() : "";
  switch (command) {
    case "/start":
      return tg.sendMessage(ownerId, `👋 Привет! Я буду присылать урок каждое утро в ${SCHEDULE.morning}.\n\n${HELP}`);
    case "/help":
      return tg.sendMessage(ownerId, HELP);
    case "/today":
      return tg.sendMessage(ownerId, await todayText(db, now), learnButton(webAppUrl));
    case "/lesson": {
      // Counts as today's morning lesson, so the scheduled one doesn't arrive as well.
      await db.claimDayFlag(localClock(now, SCHEDULE.timezone).day, "morning_sent");
      return sendMorning(db, tg, ownerId, webAppUrl, now);
    }
    default:
      return tg.sendMessage(ownerId, "Пока я понимаю только команды. " + HELP);
  }
}

async function handlePollAnswer(pollId: string, optionIds: number[], db: Db, now: Date) {
  if (optionIds.length === 0) return; // answer retracted (not possible for quizzes, but harmless)
  const poll = await db.claimPoll(pollId, now.getTime());
  if (!poll) return;
  const row = await db.getCard(poll.card_id);
  if (!row) return;
  const correct = optionIds[0] === poll.correct_option;
  const next = reviewQuiz(JSON.parse(row.fsrs), now, correct);
  const { day } = localClock(now, SCHEDULE.timezone);
  await db.batch([
    db.updateCard(row.card_id, next),
    db.logReview(row.card_id, correct ? Rating.Good : Rating.Again, now.getTime(), "poll"),
    db.bumpDay(day, "reviews"),
  ]);
}

async function todayText(db: Db, now: Date): Promise<string> {
  const { day } = localClock(now, SCHEDULE.timezone);
  const [today, due, known] = await Promise.all([db.getDay(day), db.countDue(now.getTime()), db.countCards()]);
  const flags = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" } as Record<string, string>;
  const knownLine = Object.entries(known).map(([l, n]) => `${flags[l] ?? l} ${n}`).join("  ") || "—";
  return [
    `📅 <b>${day}</b>`,
    `Ответов сегодня: ${today.reviews}, новых: ${today.new_cards}`,
    `К повторению сейчас: ${due}`,
    `Слов в работе: ${knownLine}`,
    today.morning_sent ? "" : `Утренний урок придёт в ${SCHEDULE.morning} (или /lesson сейчас).`,
  ]
    .filter(Boolean)
    .join("\n");
}
