// Connects the bot to the deployed Worker: webhook (with secret), command menu.
// Usage: pnpm setup:telegram          (configure)
//        pnpm setup:telegram --info   (just show the webhook status)
import { readDevVars } from "./secrets-push.ts";

const vars = readDevVars();
const token = vars.TELEGRAM_BOT_TOKEN;
const url = vars.WORKER_URL?.replace(/\/$/, "");
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is empty in apps/worker/.dev.vars");

async function call(method: string, body: object = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

if (!process.argv.includes("--info")) {
  if (!url?.startsWith("https://")) throw new Error("Set WORKER_URL in apps/worker/.dev.vars to the https://…workers.dev URL printed by `pnpm deploy:worker`.");
  if (!vars.TELEGRAM_WEBHOOK_SECRET) throw new Error("TELEGRAM_WEBHOOK_SECRET is empty in apps/worker/.dev.vars");
  const me = (await call("getMe")) as { username: string };
  console.log(`Bot: @${me.username}`);
  await call("setWebhook", {
    url: `${url}/tg/webhook`,
    secret_token: vars.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "poll_answer"],
    drop_pending_updates: true,
  });
  console.log(`✓ Webhook → ${url}/tg/webhook`);
  await call("setMyCommands", {
    commands: [
      { command: "today", description: "План на сегодня" },
      { command: "lesson", description: "Урок прямо сейчас" },
      { command: "help", description: "Справка" },
    ],
  });
  console.log("✓ Command menu set");
}

const info = (await call("getWebhookInfo")) as Record<string, unknown>;
console.log("Webhook status:", {
  url: info.url,
  pending_update_count: info.pending_update_count,
  last_error_message: info.last_error_message ?? "none",
});
