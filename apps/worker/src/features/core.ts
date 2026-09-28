// Core bot commands: /start, /help, /today, /lesson.
import { localClock } from "@el/core";
import { SCHEDULE } from "../content";
import { learnButton, sendMorning } from "../daily";
import type { BotContext, Feature } from "../feature";
import { helpText } from "./index";

async function todayText({ db, now }: BotContext): Promise<string> {
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

export const core: Feature = {
  id: "core",
  commands: [
    {
      name: "start",
      description: "Начать",
      menu: false,
      run: (c) => c.tg.sendMessage(c.ownerId, `👋 Привет! Я буду присылать урок каждое утро в ${SCHEDULE.morning}.\n\n${helpText()}`),
    },
    { name: "today", description: "План на сегодня", run: async (c) => c.tg.sendMessage(c.ownerId, await todayText(c), learnButton(c.webAppUrl)) },
    {
      name: "lesson",
      description: "Урок прямо сейчас",
      run: async (c) => {
        // Counts as today's morning lesson, so the scheduled one doesn't arrive as well.
        await c.db.claimDayFlag(localClock(c.now, SCHEDULE.timezone).day, "morning_sent");
        return sendMorning(c.db, c.tg, c.ownerId, c.webAppUrl, c.now);
      },
    },
    { name: "help", description: "Справка", run: (c) => c.tg.sendMessage(c.ownerId, helpText()) },
  ],
};
