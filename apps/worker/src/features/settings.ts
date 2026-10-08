// Settings, stats, streaks and holiday mode: /stats, /pause, /new; Mini App /api/settings and /api/stats.
import { computeStreak, LANGS, localClock, type Lang } from "@el/core";
import { Hono } from "hono";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { getPrefs, updatePrefs } from "../prefs";
import { timezone } from "../profile";

const FLAG: Record<Lang, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };
const DAY_MS = 86_400_000;

const shiftDay = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export async function stats(db: Db, now: Date) {
  const { day } = localClock(now, timezone());
  const [prefs, history, known, retention] = await Promise.all([
    getPrefs(db),
    db.activityHistory(shiftDay(day, -400)),
    db.countCards(),
    db.retention(now.getTime() - 30 * DAY_MS),
  ]);
  const streak = computeStreak(
    history.map((h) => ({ day: h.day, reviews: h.reviews, paused: h.paused === 1 })),
    day,
    prefs.min_day_answers,
  );
  const byDay = new Map(history.map((h) => [h.day, h]));
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = shiftDay(day, i - 29);
    const h = byDay.get(d);
    return { day: d, reviews: h?.reviews ?? 0, done: (h?.reviews ?? 0) >= prefs.min_day_answers, paused: h?.paused === 1 };
  });
  return {
    day,
    ...streak,
    minAnswers: prefs.min_day_answers,
    known,
    retention30: retention.total ? Math.round((100 * retention.correct) / retention.total) : null,
    answers30: retention.total,
    last30,
  };
}

async function statsText({ db, now }: BotContext): Promise<string> {
  const s = await stats(db, now);
  const cal = s.last30.map((d) => (d.paused ? "⏸" : d.done ? "🟩" : d.reviews > 0 ? "🟨" : "⬜")).join("");
  const known = LANGS.filter((l) => s.known[l]).map((l) => `${FLAG[l]} ${s.known[l]}`).join("  ") || "—";
  return [
    `🔥 Серия: <b>${s.streak}</b> ${s.todayDone ? "(сегодня ✅)" : `(сегодня нужно ${s.minAnswers} ответов)`}`,
    `❄️ Заморозки: ${s.freezes} · рекорд: ${s.best}`,
    `📚 Слов в работе: ${known}`,
    `🎯 Верных ответов за 30 дней: ${s.retention30 ?? "—"}%${s.answers30 ? ` (${s.answers30} ответов)` : ""}`,
    "",
    "Последние 30 дней:",
    cal,
  ].join("\n");
}

async function pause(c: BotContext, args: string) {
  const { day } = localClock(c.now, timezone());
  if (/^(off|stop|0|нет|стоп)$/i.test(args)) {
    await c.db.clearPausedFrom(day).run();
    return c.tg.sendMessage(c.ownerId, "▶️ Пауза снята, уроки снова приходят.");
  }
  const n = args ? Number(args) : 1;
  if (!Number.isInteger(n) || n < 1 || n > 30) return c.tg.sendMessage(c.ownerId, "Формат: /pause 3 (дней, 1–30) или /pause off");
  await c.db.batch(Array.from({ length: n }, (_, i) => c.db.setPaused(shiftDay(day, i), true)));
  return c.tg.sendMessage(
    c.ownerId,
    `⏸ Пауза на ${n} ${n === 1 ? "день" : n < 5 ? "дня" : "дней"} (по ${shiftDay(day, n - 1)}). Уроков и напоминаний не будет, серия не сгорит.\n/pause off — вернуться раньше.`,
  );
}

async function setNew(c: BotContext, args: string) {
  const [lang, nStr] = args.split(/\s+/);
  const n = Number(nStr);
  if (!LANGS.includes(lang as Lang) || !Number.isInteger(n) || n < 0 || n > 30) {
    const p = await getPrefs(c.db);
    const now = LANGS.map((l) => `${FLAG[l]} ${p.new_per_day[l] ?? 0}`).join("  ");
    return c.tg.sendMessage(c.ownerId, `Новых слов в день сейчас: ${now}\nИзменить: /new lt 8 (язык: lt, es, fr; 0–30)`);
  }
  const r = await updatePrefs(c.db, { new_per_day: { [lang!]: n } });
  return c.tg.sendMessage(c.ownerId, r.ok ? `✅ ${FLAG[lang as Lang]} новых слов в день: ${n}` : `Ошибка: ${r.error}`);
}

const api = new Hono<{ Bindings: Env }>();

api.get("/settings", async (c) => c.json({ prefs: await getPrefs(new Db(c.env.DB)), timezone: timezone() }));

api.put("/settings", async (c) => {
  const r = await updatePrefs(new Db(c.env.DB), await c.req.json().catch(() => null));
  return r.ok ? c.json({ prefs: r.prefs }) : c.json({ error: r.error }, 400);
});

api.get("/stats", async (c) => {
  return c.json(await stats(new Db(c.env.DB), new Date()));
});

export const settings: Feature = {
  id: "settings",
  commands: [
    { name: "stats", description: "Серия, прогресс, 30 дней", run: async (c) => c.tg.sendMessage(c.ownerId, await statsText(c)) },
    { name: "pause", description: "Пауза: /pause 3 или /pause off", run: pause },
    { name: "new", description: "Новых слов в день: /new lt 8", run: setNew },
  ],
  api,
};
