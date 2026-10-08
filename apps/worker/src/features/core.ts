// Core bot commands: /start, /help, /today, /lesson.
import { localClock } from "@el/core";
import { learnButton, newWordsButton, sendMorning } from "../daily";
import { getPrefs } from "../prefs";
import type { BotContext, Feature } from "../feature";
import { isCopy } from "../owner";
import { helpText } from "./index";
import { timezone } from "../profile";

async function todayText({ db, now }: BotContext): Promise<{ text: string; learning: number }> {
  const { day } = localClock(now, timezone());
  const [today, due, learning, known, prefs] = await Promise.all([
    db.getDay(day),
    db.countDue(now.getTime()),
    db.countLearning(),
    db.countCards(),
    getPrefs(db),
  ]);
  const flags = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" } as Record<string, string>;
  const knownLine = Object.entries(known).map(([l, n]) => `${flags[l] ?? l} ${n}`).join("  ") || "—";
  const text = [
    `📅 <b>${day}</b>`,
    `Ответов сегодня: ${today.reviews} из ${prefs.min_day_answers}${today.reviews >= prefs.min_day_answers ? " ✅" : ""}, новых: ${today.new_cards}`,
    `К повторению сейчас: ${due}`,
    learning ? `Новых слов к изучению: ${learning}` : "",
    `Слов в работе: ${knownLine}`,
    today.paused ? "⏸ Сегодня пауза (/pause off — вернуться)." : today.morning_sent ? "" : `Утренний урок придёт в ${prefs.morning} (или /lesson сейчас).`,
  ]
    .filter(Boolean)
    .join("\n");
  return { text, learning };
}

export const core: Feature = {
  id: "core",
  commands: [
    {
      name: "start",
      description: "Начать",
      menu: false,
      run: async (c) =>
        c.tg.sendMessage(c.ownerId, `👋 Привет! Я буду присылать урок каждое утро в ${(await getPrefs(c.db)).morning}.\n\n${helpText(isCopy(c.env))}`),
    },
    {
      name: "today",
      description: "План на сегодня",
      run: async (c) => {
        const { text, learning } = await todayText(c);
        return c.tg.sendMessage(c.ownerId, text, learning ? newWordsButton(c.webAppUrl) : learnButton(c.webAppUrl));
      },
    },
    {
      name: "lesson",
      description: "Урок прямо сейчас",
      run: async (c) => {
        // Counts as today's morning lesson, so the scheduled one doesn't arrive as well.
        await c.db.claimDayFlag(localClock(c.now, timezone()).day, "morning_sent");
        return sendMorning(c.db, c.tg, c.ownerId, c.webAppUrl, c.now);
      },
    },
    { name: "help", description: "Справка", run: (c) => c.tg.sendMessage(c.ownerId, helpText(isCopy(c.env))) },
  ],
};
