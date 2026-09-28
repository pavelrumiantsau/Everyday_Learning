// A feature plugs into the bot, the Mini App API and the 15-minute schedule by exporting a `Feature`
// and being listed in features/index.ts. Features keep their own tables, queries and code in their own files.
import type { Hono } from "hono";
import type { Db } from "./db";
import type { Telegram, TgMessage } from "./telegram";

export interface BotContext {
  env: Env;
  db: Db;
  tg: Telegram;
  ownerId: string;
  webAppUrl: string;
  now: Date;
  /** Keep work running after the webhook has answered (e.g. slow AI calls). */
  waitUntil(p: Promise<unknown>): void;
}

export interface Command {
  name: string; // without the slash
  description: string; // Russian, shown in /help and in Telegram's command menu
  menu?: boolean; // show in Telegram's command menu (default true)
  run(ctx: BotContext, args: string): Promise<unknown>;
}

export interface Feature {
  id: string;
  commands?: Command[];
  /** Non-command messages (text, voice…). Return true if handled; features are asked in list order. */
  onMessage?(ctx: BotContext, message: TgMessage): Promise<boolean>;
  /** Mini App API, mounted under /api after Telegram login is verified. */
  api?: Hono<{ Bindings: Env }>;
  /** Runs every 15 minutes after the morning/evening logic; return a short label when it did something. */
  onTick?(ctx: BotContext): Promise<string | void>;
}
