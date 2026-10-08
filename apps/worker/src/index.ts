import { Hono } from "hono";
import { api } from "./api";
import { handleUpdate } from "./bot";
import { tick } from "./daily";
import { Db } from "./db";
import type { BotContext } from "./feature";
import { handleUnclaimed, resolveOwner } from "./owner";
import { loadProfile, needsSetup } from "./profile";
import { Telegram, type TgUpdate } from "./telegram";

function botContext(env: Env, ownerId: string, waitUntil: (p: Promise<unknown>) => void): BotContext {
  return {
    env,
    db: new Db(env.DB),
    tg: new Telegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_API_BASE),
    ownerId,
    webAppUrl: env.WEBAPP_URL,
    now: new Date(),
    waitUntil,
  };
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.text("Everyday Learning is running."));
app.route("/api", api);

app.post("/tg/webhook", async (c) => {
  if (c.req.header("x-telegram-bot-api-secret-token") !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.text("forbidden", 403);
  }
  const update = await c.req.json<TgUpdate>();
  try {
    const db = new Db(c.env.DB);
    let owner = await resolveOwner(c.env, db);
    if (!owner) {
      // A copy nobody has claimed yet (src/owner.ts). The claiming `/start <code>` then runs as a normal /start.
      if ((await handleUnclaimed(update, c.env, db, new Telegram(c.env.TELEGRAM_BOT_TOKEN, c.env.TELEGRAM_API_BASE))) !== "claimed") {
        return c.text("ok");
      }
      owner = (await resolveOwner(c.env, db))!;
    }
    await loadProfile(db);
    await handleUpdate(update, botContext(c.env, owner, (p) => c.executionCtx.waitUntil(p)));
  } catch (err) {
    // Log and still return 200, otherwise Telegram retries the same update over and over.
    console.error("update failed", update.update_id, err);
  }
  return c.text("ok");
});

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    const db = new Db(env.DB);
    const owner = await resolveOwner(env, db);
    if (!owner) return console.log("tick: no owner yet (copy not claimed)");
    await loadProfile(db);
    if (needsSetup(env)) return console.log("tick: waiting for the setup wizard");
    ctx.waitUntil(tick(botContext(env, owner, (p) => ctx.waitUntil(p))).then((r) => console.log("tick:", r)));
  },
} satisfies ExportedHandler<Env>;
