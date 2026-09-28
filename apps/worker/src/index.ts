import { Hono } from "hono";
import { api } from "./api";
import { handleUpdate } from "./bot";
import { tick } from "./daily";
import { Db } from "./db";
import { Telegram, type TgUpdate } from "./telegram";

const telegram = (env: Env) => new Telegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_API_BASE);

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.text("Everyday Learning is running."));
app.route("/api", api);

app.post("/tg/webhook", async (c) => {
  if (c.req.header("x-telegram-bot-api-secret-token") !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.text("forbidden", 403);
  }
  const update = await c.req.json<TgUpdate>();
  try {
    await handleUpdate(update, new Db(c.env.DB), telegram(c.env), c.env.TELEGRAM_USER_ID, c.env.WEBAPP_URL);
  } catch (err) {
    // Log and still return 200, otherwise Telegram retries the same update over and over.
    console.error("update failed", update.update_id, err);
  }
  return c.text("ok");
});

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      tick(new Db(env.DB), telegram(env), env.TELEGRAM_USER_ID, env.WEBAPP_URL).then((r) => console.log("tick:", r)),
    );
  },
} satisfies ExportedHandler<Env>;
