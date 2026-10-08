// Quarterly self-check (instead of official exams): on the last Sunday of each quarter the bot sends a checklist poll
// per active language with that quarter's can-do goals (config/milestones.yaml), plus a writing and a speaking task.
import { inWindow, localClock, type Lang } from "@el/core";
import { MILESTONES } from "../content";
import type { BotContext, Feature } from "../feature";
import { getPrefs } from "../prefs";
import { currentProfile, timezone } from "../profile";

const FLAG: Record<Lang, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };
const SEND_AT = "11:00";

const shiftDay = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function quarterOf(day: string) {
  return MILESTONES.quarters.find((q) => q.start <= day && day <= q.end);
}

/** The last Sunday on or before the quarter's end. */
export function checkDay(q: { end: string }): string {
  let d = q.end;
  while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 0) d = shiftDay(d, -1);
  return d;
}

async function sendCheck(c: BotContext, quarterId?: string): Promise<number> {
  // config/milestones.yaml holds the original plan's quarterly goals; copies get course milestones later (EXTENSION-PLAN §8, phase D).
  if (currentProfile()) {
    await c.tg.sendMessage(c.ownerId, "Самопроверка по целям появится вместе с курсом (в ближайших обновлениях).");
    return 0;
  }
  const { day } = localClock(c.now, timezone());
  const q = quarterId ? MILESTONES.quarters.find((x) => x.id === quarterId) : quarterOf(day);
  if (!q) {
    await c.tg.sendMessage(c.ownerId, "Для этой даты целей нет (config/milestones.yaml).");
    return 0;
  }
  const prefs = await getPrefs(c.db);
  const langs = (["lt", "es", "fr"] as const).filter((l) => q[l]?.length && (prefs.new_per_day[l] ?? 0) > 0);
  await c.tg.sendMessage(
    c.ownerId,
    [
      `🧭 <b>Самопроверка · ${q.label}</b>`,
      "Отметь честно, что уже получается. Это нужно, чтобы подстроить следующий квартал.",
      "",
      "Ещё два задания на эту неделю:",
      "✍️ Напиши боту текст на литовском (8–10 предложений о своём квартале) — получишь разбор ошибок.",
      "🎙 10 минут разговора в проекте «Lietuvių korepetitorius» в приложении Claude.",
    ].join("\n"),
  );
  for (const lang of langs) {
    const options = q[lang]!;
    const sent = await c.tg.sendPoll(c.ownerId, `${FLAG[lang]} Что ты уже можешь?`, options, true);
    await c.env.DB.prepare("INSERT INTO assessment (poll_id, quarter, lang, options, sent_at) VALUES (?, ?, ?, ?, ?)")
      .bind(sent.poll.id, q.id, lang, JSON.stringify(options), Date.now())
      .run();
  }
  return langs.length;
}

export const assessment: Feature = {
  id: "assessment",
  commands: [{ name: "check", description: "Самопроверка по целям квартала", run: (c) => sendCheck(c) }],
  async onPollAnswer(c, pollId, optionIds) {
    const row = await c.env.DB.prepare("SELECT lang, options FROM assessment WHERE poll_id = ?").bind(pollId).first<{ lang: Lang; options: string }>();
    if (!row) return false;
    await c.env.DB.prepare("UPDATE assessment SET selected = ?, answered_at = ? WHERE poll_id = ?")
      .bind(JSON.stringify(optionIds), Date.now(), pollId)
      .run();
    const total = (JSON.parse(row.options) as string[]).length;
    const n = optionIds.length;
    const verdict = n === total ? "Цели квартала достигнуты 🎉" : n >= total / 2 ? "Хороший прогресс 👍" : "Есть над чем поработать — план подстроим.";
    await c.tg.sendMessage(c.ownerId, `${FLAG[row.lang]} Отмечено ${n} из ${total}. ${verdict}`);
    return true;
  },
  async onTick(c) {
    if (currentProfile()) return; // the quarterly goals belong to the original plan
    const { day, hhmm } = localClock(c.now, timezone());
    const q = quarterOf(day);
    if (!q || day !== checkDay(q) || !inWindow(hhmm, SEND_AT, 240)) return;
    const claimed = await c.env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, '1')").bind(`check_sent:${q.id}`).run();
    if (claimed.meta.changes !== 1) return;
    await sendCheck(c, q.id);
    return "check";
  },
};
