// Passive input log (/input, Mini App) and the Sunday weekly report with automatic adjustment of new words/day.
import { adjustNewPerDay, escapeHtml, inWindow, LANGS, localClock, LT_INPUT_TARGET_MIN, verdict, type Lang, type WeekSummary } from "@el/core";
import { Hono } from "hono";
import { SOURCES } from "../content";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { getPrefs, updatePrefs } from "../prefs";
import { sendWritingReview } from "./mistakes";
import { currentProfile, timezone } from "../profile";

const FLAG: Record<Lang, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };
const KINDS = ["podcast", "video", "radio", "reading", "conversation", "other"] as const;
const KIND_RU: Record<(typeof KINDS)[number], string> = {
  podcast: "подкаст", video: "видео", radio: "радио", reading: "чтение", conversation: "разговор", other: "другое",
};
const WEEKLY_DAY = 0; // Sunday
const WEEKLY_AT = "18:00";
const DAY_MS = 86_400_000;

const shiftDay = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

async function logInput(d1: D1Database, day: string, lang: Lang, minutes: number, kind: string, title: string | null) {
  await d1
    .prepare("INSERT INTO input_log (id, day, lang, kind, minutes, title, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), day, lang, kind, minutes, title, Date.now())
    .run();
}

async function inputSince(d1: D1Database, fromDay: string): Promise<Record<string, number>> {
  const { results } = await d1
    .prepare("SELECT lang, SUM(minutes) AS m FROM input_log WHERE day >= ? GROUP BY lang")
    .bind(fromDay)
    .all<{ lang: string; m: number }>();
  return Object.fromEntries(results.map((r) => [r.lang, r.m]));
}

function parseInput(args: string): { minutes: number; lang: Lang; kind: (typeof KINDS)[number]; title: string | null } | null {
  const [m, lang, kind, ...rest] = args.split(/\s+/);
  const minutes = Number(m);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600 || !LANGS.includes(lang as Lang)) return null;
  const k = (KINDS as readonly string[]).includes(kind ?? "") ? (kind as (typeof KINDS)[number]) : "other";
  const title = [k === "other" && kind ? kind : "", ...rest].filter(Boolean).join(" ").slice(0, 200) || null;
  return { minutes, lang: lang as Lang, kind: k, title };
}

export async function weekSummary(db: Db, d1: D1Database, now: Date): Promise<WeekSummary & { newWords: number; from: string; to: string }> {
  const { day } = localClock(now, timezone());
  const from = shiftDay(day, -6);
  const [prefs, history, ret, due, input] = await Promise.all([
    getPrefs(db),
    db.activityHistory(from),
    db.retention(now.getTime() - 7 * DAY_MS),
    db.countDue(now.getTime()),
    inputSince(d1, from),
  ]);
  return {
    from,
    to: day,
    daysDone: history.filter((h) => h.reviews >= prefs.min_day_answers).length,
    answers: history.reduce((a, h) => a + h.reviews, 0),
    newWords: history.reduce((a, h) => a + h.new_cards, 0),
    retention: ret.total ? Math.round((100 * ret.correct) / ret.total) : null,
    dueBacklog: due,
    inputMinutes: input,
  };
}

/** One source per week, rotating through the language's list so the tip changes every Sunday. */
export function suggestion(lang: Lang, day: string) {
  const list = SOURCES.filter((s) => s.lang === lang);
  if (!list.length) return null;
  const week = Math.floor(Date.parse(`${day}T12:00:00Z`) / (7 * DAY_MS));
  return list[week % list.length]!;
}

const VERDICT_RU = { ahead: "🚀 Впереди графика", on_track: "✅ В графике", behind: "⚠️ Отстаёшь от графика" };
const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60} мин` : `${m} мин`);

export async function sendWeekly(c: BotContext, adjust: boolean) {
  const w = await weekSummary(c.db, c.env.DB, c.now);
  const v = verdict(w);
  const lines = [
    `📊 <b>Неделя ${w.from} — ${w.to}</b>`,
    VERDICT_RU[v],
    "",
    `📅 Дней засчитано: ${w.daysDone}/7`,
    `🧠 Ответов: ${w.answers}, новых слов: ${w.newWords}`,
    `🎯 Верных: ${w.retention ?? "—"}%`,
    `🎧 Аудирование/чтение: ${LANGS.filter((l) => w.inputMinutes[l]).map((l) => `${FLAG[l]} ${hours(w.inputMinutes[l]!)}`).join(", ") || "не отмечено"}`,
  ];
  const lt = w.inputMinutes.lt ?? 0;
  const p = currentProfile();
  if (lt < LT_INPUT_TARGET_MIN && (!p || p.languages.lt)) {
    lines.push(`   🇱🇹 цель — 3 ч в неделю (LRT, подкасты, сериалы). Отмечай: /input 30 lt podcast`);
    const tip = suggestion("lt", w.to);
    if (tip) lines.push(`   💡 Попробуй: <a href="${tip.url}">${escapeHtml(tip.title)}</a> — ${escapeHtml(tip.note)}`);
  }
  if (adjust) {
    const prefs = await getPrefs(c.db);
    const cur = Object.fromEntries(LANGS.map((l) => [l, prefs.new_per_day[l] ?? 0]));
    const { next, reason } = adjustNewPerDay(cur, w);
    if (reason) {
      await updatePrefs(c.db, { new_per_day: next });
      lines.push("", `⚙️ Новых слов в день теперь: ${LANGS.filter((l) => next[l]).map((l) => `${FLAG[l]} ${next[l]}`).join("  ")} — ${reason}.`, "Вернуть: /new lt 10");
    }
  }
  return c.tg.sendMessage(c.ownerId, lines.join("\n"));
}

const api = new Hono<{ Bindings: Env }>();

api.post("/input", async (c) => {
  const b = await c.req.json<{ lang?: string; minutes?: number; kind?: string; title?: string }>().catch(() => ({}) as Record<string, never>);
  const parsed = parseInput(`${b.minutes ?? ""} ${b.lang ?? ""} ${b.kind ?? ""} ${b.title ?? ""}`.trim());
  if (!parsed) return c.json({ error: "minutes 1–600, lang lt|es|fr" }, 400);
  const { day } = localClock(new Date(), timezone());
  await logInput(c.env.DB, day, parsed.lang, parsed.minutes, parsed.kind, parsed.title);
  return c.json({ week: await inputSince(c.env.DB, shiftDay(day, -6)) });
});

api.get("/input/sources", (c) => c.json({ sources: SOURCES }));

api.get("/input/week", async (c) => {
  const { day } = localClock(new Date(), timezone());
  return c.json({ week: await inputSince(c.env.DB, shiftDay(day, -6)), targetLt: LT_INPUT_TARGET_MIN });
});

export const progress: Feature = {
  id: "progress",
  commands: [
    {
      name: "input",
      description: "Отметить аудирование/чтение: /input 30 lt podcast",
      run: async (c, args) => {
        const p = parseInput(args);
        if (!p) {
          return c.tg.sendMessage(
            c.ownerId,
            `Формат: /input <минуты> <язык> [тип] [название]\nНапример: /input 30 lt podcast LRT\nТипы: ${KINDS.join(", ")}`,
          );
        }
        const { day } = localClock(c.now, timezone());
        await logInput(c.env.DB, day, p.lang, p.minutes, p.kind, p.title);
        const week = await inputSince(c.env.DB, shiftDay(day, -6));
        return c.tg.sendMessage(c.ownerId, `✅ ${FLAG[p.lang]} ${p.minutes} мин (${KIND_RU[p.kind]}). За 7 дней: ${hours(week[p.lang] ?? 0)}`);
      },
    },
    { name: "week", description: "Отчёт за неделю", run: (c) => sendWeekly(c, false) },
  ],
  api,
  async onTick(c) {
    const { day, hhmm } = localClock(c.now, timezone());
    if (weekday(day) !== WEEKLY_DAY || !inWindow(hhmm, WEEKLY_AT, 180)) return;
    const claimed = await c.env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, '1')").bind(`weekly_sent:${day}`).run();
    if (claimed.meta.changes !== 1) return;
    await sendWeekly(c, true);
    await sendWritingReview(c).catch((err) => console.error("weekly writing review failed", err)); // AI may be down; the report still went out
    return "weekly";
  },
};
