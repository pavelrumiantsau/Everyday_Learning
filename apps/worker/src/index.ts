import { Hono } from "hono";
import { api } from "./api";
import { handleUpdate } from "./bot";
import { tick } from "./daily";
import { Db } from "./db";
import type { BotContext } from "./feature";
import { Telegram, type TgUpdate } from "./telegram";

function botContext(env: Env, waitUntil: (p: Promise<unknown>) => void): BotContext {
  return {
    env,
    db: new Db(env.DB),
    tg: new Telegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_API_BASE),
    ownerId: env.TELEGRAM_USER_ID,
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
    await handleUpdate(update, botContext(c.env, (p) => c.executionCtx.waitUntil(p)));
  } catch (err) {
    // Log and still return 200, otherwise Telegram retries the same update over and over.
    console.error("update failed", update.update_id, err);
  }
  return c.text("ok");
});

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(botContext(env, (p) => ctx.waitUntil(p))).then((r) => console.log("tick:", r)));
  },
} satisfies ExportedHandler<Env>;
