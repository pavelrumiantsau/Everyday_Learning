// JSON API for the Mini App. Every request carries Telegram's signed launch data:
//   Authorization: tma <window.Telegram.WebApp.initData>
// Routes live in the features (features/*.ts → `api`).
import { verifyInitData } from "@el/core";
import { Hono } from "hono";
import { FEATURES } from "./features";

export const api = new Hono<{ Bindings: Env }>();

api.use("*", async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  if (!auth.startsWith("tma ")) return c.json({ error: "open the app from Telegram" }, 401);
  const result = await verifyInitData(auth.slice(4), c.env.TELEGRAM_BOT_TOKEN);
  if (!result.ok) return c.json({ error: result.reason }, 401);
  if (result.userId !== c.env.TELEGRAM_USER_ID) return c.json({ error: "not your bot" }, 403);
  await next();
});

for (const f of FEATURES) if (f.api) api.route("/", f.api);
