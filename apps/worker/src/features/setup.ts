// First-run setup wizard of a colleague's copy (docs/EXTENSION-PLAN.md §5): /setup and the Mini App's «Настройка» screen.
// GET /api/profile → the profile (or null) and defaults; POST /api/profile → saves the answers and sends the first lesson.
// The owner's deployment keeps its original plan: /setup there only says so, and POST is refused.
import { localClock, PACES, SetupAnswers } from "@el/core";
import { Hono } from "hono";
import { sendMorning } from "../daily";
import { Db } from "../db";
import type { BotContext, Feature } from "../feature";
import { getPrefs } from "../prefs";
import { isCopy, resolveOwner } from "../owner";
import { currentProfile, saveSetup, timezone } from "../profile";
import { Telegram } from "../telegram";

export const setupButton = (url: string) => ({ text: "⚙️ Настроить обучение", url: `${url}?screen=setup` });

/** The message a copy sends until the wizard is answered. */
export function askForSetup(c: BotContext) {
  return c.tg.sendMessage(
    c.ownerId,
    "👋 Привет! Сначала настроим обучение: какие языки учить, ваш уровень и темп. Это 2 минуты.",
    setupButton(c.webAppUrl),
  );
}

const api = new Hono<{ Bindings: Env }>();

api.get("/profile", async (c) => {
  const prefs = await getPrefs(new Db(c.env.DB));
  return c.json({
    copy: isCopy(c.env),
    profile: currentProfile(),
    rhythm: { morning: prefs.morning, evening: prefs.evening, min_day_answers: prefs.min_day_answers },
    timezone: timezone(),
    paces: PACES,
  });
});

api.post("/profile", async (c) => {
  if (!isCopy(c.env)) return c.json({ error: "this bot keeps its original plan" }, 403);
  const parsed = SetupAnswers.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, 400);
  const db = new Db(c.env.DB);
  const first = currentProfile() === null;
  const saved = await saveSetup(db, parsed.data);
  if (!saved.ok) return c.json({ error: saved.error }, 400);
  if (first) {
    // The first lesson comes right away; it counts as today's morning lesson.
    const owner = (await resolveOwner(c.env, db))!;
    const now = new Date();
    await db.claimDayFlag(localClock(now, timezone()).day, "morning_sent");
    await sendMorning(db, new Telegram(c.env.TELEGRAM_BOT_TOKEN, c.env.TELEGRAM_API_BASE), owner, c.env.WEBAPP_URL, now);
  }
  return c.json({ ok: true, profile: currentProfile() });
});

export const setup: Feature = {
  id: "setup",
  commands: [
    {
      name: "setup",
      description: "Настройка: языки, уровень, темп",
      copyOnly: true,
      run: (c) =>
        isCopy(c.env)
          ? c.tg.sendMessage(c.ownerId, "Языки, уровень, темп и время уроков — всё можно поменять, прогресс сохранится.", setupButton(c.webAppUrl))
          : c.tg.sendMessage(c.ownerId, "В этом боте действует исходный план (настройка нужна только в личных копиях). Изменить темп и время: ⚙️ в приложении или /new."),
    },
  ],
  api,
};
