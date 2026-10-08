// Connects the bot to the deployed Worker: webhook (with secret), command menu, ▶ Learn button (Mini App).
// Usage: pnpm setup:telegram          (configure)
//        pnpm setup:telegram --info   (just show the webhook status)
import { readDevVars } from "./secrets-push.ts";
import { setMenus, setWebhook, telegram } from "./telegram-config.ts";

const vars = readDevVars();
const token = vars.TELEGRAM_BOT_TOKEN;
const url = vars.WORKER_URL?.replace(/\/$/, "");
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is empty in apps/worker/.dev.vars");
const call = telegram(token);

if (!process.argv.includes("--info")) {
  if (!url?.startsWith("https://")) throw new Error("Set WORKER_URL in apps/worker/.dev.vars to the https://…workers.dev URL printed by `pnpm deploy:worker`.");
  if (!vars.TELEGRAM_WEBHOOK_SECRET) throw new Error("TELEGRAM_WEBHOOK_SECRET is empty in apps/worker/.dev.vars");
  const me = await call<{ username: string }>("getMe");
  console.log(`Bot: @${me.username}`);
  await setWebhook(call, url, vars.TELEGRAM_WEBHOOK_SECRET);
  console.log(`✓ Webhook → ${url}/tg/webhook`);
  await setMenus(call, url);
  console.log("✓ Command menu set");
  console.log("✓ ▶ Learn button opens the Mini App");
}

const info = await call<Record<string, unknown>>("getWebhookInfo");
console.log("Webhook status:", {
  url: info.url,
  pending_update_count: info.pending_update_count,
  last_error_message: info.last_error_message ?? "none",
});
