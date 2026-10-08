// Telegram update routing: owner check → quiz answers → commands → feature message handlers → help.
import { localClock, reviewQuiz, Rating } from "@el/core";
import type { Db } from "./db";
import type { BotContext } from "./feature";
import { COMMANDS, FEATURES, helpText } from "./features";
import { answerStranger, isCopy } from "./owner";
import { askForSetup } from "./features/setup";
import { needsSetup, timezone } from "./profile";
import type { TgUpdate } from "./telegram";

export async function handleUpdate(update: TgUpdate, ctx: BotContext) {
  // Ignore everyone except the owner (a copy tells strangers how to get their own bot: src/owner.ts).
  const fromId = update.message?.from?.id ?? update.poll_answer?.user?.id;
  if (String(fromId) !== ctx.ownerId) return isCopy(ctx.env) ? answerStranger(update, ctx.tg) : undefined;
  // A copy works only in its owner's private chat: groups and channels are ignored.
  if (isCopy(ctx.env) && update.message && update.message.chat.type !== "private") return;
  // A copy teaches nothing until the setup wizard is answered (only /setup and /help work meanwhile).
  if (needsSetup(ctx.env)) {
    const name = /^\/(\w+)/.exec(update.message?.text?.trim() ?? "")?.[1]?.toLowerCase();
    if (name === "setup" || name === "help") return COMMANDS.find((c) => c.name === name)!.run(ctx, "");
    return update.message ? askForSetup(ctx) : undefined;
  }

  if (update.poll_answer) {
    const { poll_id, option_ids } = update.poll_answer;
    for (const f of FEATURES) if (f.onPollAnswer && (await f.onPollAnswer(ctx, poll_id, option_ids))) return;
    return handlePollAnswer(poll_id, option_ids, ctx.db, ctx.now);
  }

  const message = update.message;
  if (!message) return;
  const text = message.text?.trim() ?? "";
  if (text.startsWith("/")) {
    const name = text.slice(1).split(/[\s@]/)[0]!.toLowerCase();
    const command = COMMANDS.find((c) => c.name === name);
    if (command) return command.run(ctx, text.slice(name.length + 1).trim());
  } else {
    for (const f of FEATURES) if (f.onMessage && (await f.onMessage(ctx, message))) return;
  }
  return ctx.tg.sendMessage(ctx.ownerId, "Не понял. " + helpText(isCopy(ctx.env)));
}

async function handlePollAnswer(pollId: string, optionIds: number[], db: Db, now: Date) {
  if (optionIds.length === 0) return; // answer retracted (not possible for quizzes, but harmless)
  const poll = await db.claimPoll(pollId, now.getTime());
  if (!poll) return;
  const row = await db.getCard(poll.card_id);
  if (!row) return;
  const correct = optionIds[0] === poll.correct_option;
  const next = reviewQuiz(JSON.parse(row.fsrs), now, correct);
  const { day } = localClock(now, timezone());
  await db.batch([
    db.updateCard(row.card_id, next),
    db.logReview(row.card_id, correct ? Rating.Good : Rating.Again, now.getTime(), "poll"),
    db.bumpDay(day, "reviews"),
  ]);
}
