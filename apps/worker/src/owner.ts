// Who this bot belongs to (docs/EXTENSION-PLAN.md §3.1): one bot = one learner.
// - The owner's deployment has the TELEGRAM_USER_ID secret: behaviour as before, no database lookup, strangers ignored.
// - A colleague's copy has no such secret. The Setup workflow stores a one-time CLAIM_CODE and prints the link
//   t.me/<bot>?start=<code>; the first `/start <code>` binds the bot to that Telegram user (settings.owner).
//   After that, anyone else gets one line pointing to the setup guide, and nothing is stored or sent to the AI.
import type { Db } from "./db";
import type { Telegram, TgUpdate } from "./telegram";

const OWNER_KEY = "owner";

export const SETUP_GUIDE_URL = "https://github.com/pavelrumiantsau/Everyday_Learning/blob/main/docs/SETUP-COPY.md";

/** A colleague's copy (owner bound by claim) rather than the original deployment (owner fixed by secret). */
export const isCopy = (env: Env) => !env.TELEGRAM_USER_ID;

/** The owner's Telegram user id, or null while a copy is still unclaimed. */
export async function resolveOwner(env: Env, db: Db): Promise<string | null> {
  if (env.TELEGRAM_USER_ID) return env.TELEGRAM_USER_ID;
  return db.getSetting<string>(OWNER_KEY);
}

const privateMessage = (update: TgUpdate) => (update.message?.chat.type === "private" ? update.message : undefined);

/** Updates to a copy that nobody has claimed yet: only a private `/start <CLAIM_CODE>` does anything. */
export async function handleUnclaimed(update: TgUpdate, env: Env, db: Db, tg: Telegram): Promise<"claimed" | null> {
  const message = privateMessage(update);
  if (!message?.from) return null;
  const code = /^\/start\s+(\S+)$/.exec(message.text?.trim() ?? "")?.[1];
  if (!env.CLAIM_CODE || code !== env.CLAIM_CODE) {
    await tg.sendMessage(
      message.chat.id,
      "Этот бот ещё не привязан. Откройте ссылку из GitHub: ваш репозиторий → Actions → Setup → последний запуск → Summary.",
    );
    return null;
  }
  // Only the first claim wins, even if two arrive at once.
  const me = String(message.from.id);
  await db.claimSetting(OWNER_KEY, me);
  if ((await db.getSetting<string>(OWNER_KEY)) !== me) return null;
  return "claimed";
}

/** A message to a claimed copy from someone who isn't its owner: one line, private chats only. */
export async function answerStranger(update: TgUpdate, tg: Telegram): Promise<void> {
  const message = privateMessage(update);
  if (!message) return;
  await tg.sendMessage(message.chat.id, `Это личный бот для изучения языков. Свой такой же можно сделать по инструкции: ${SETUP_GUIDE_URL}`);
}
