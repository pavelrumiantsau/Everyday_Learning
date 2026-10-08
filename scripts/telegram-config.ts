// Telegram Bot API calls that connect a bot to its Worker. Used by `pnpm setup:telegram` (the owner's Mac) and by
// scripts/ci/copy.ts (the Setup / Update workflows of colleagues' copies).
import { COMMANDS } from "../apps/worker/src/features/index.ts";

export function telegram(token: string, apiBase = "https://api.telegram.org") {
  return async function call<T = unknown>(method: string, body: object = {}): Promise<T> {
    const res = await fetch(`${apiBase}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) throw new Error(`${method}: ${data.description}`);
    return data.result as T;
  };
}

/** Command menu and the ▶ Learn button that opens the Mini App at `url`. */
export async function setMenus(call: ReturnType<typeof telegram>, url: string) {
  await call("setMyCommands", {
    commands: COMMANDS.filter((c) => c.menu !== false).map((c) => ({ command: c.name, description: c.description })),
  });
  await call("setChatMenuButton", { menu_button: { type: "web_app", text: "▶ Learn", web_app: { url: `${url}/` } } });
}

/** Telegram delivers updates to `${url}/tg/webhook`, signed with `secret`. */
export async function setWebhook(call: ReturnType<typeof telegram>, url: string, secret: string) {
  await call("setWebhook", {
    url: `${url}/tg/webhook`,
    secret_token: secret,
    allowed_updates: ["message", "poll_answer"],
    drop_pending_updates: true,
  });
}
