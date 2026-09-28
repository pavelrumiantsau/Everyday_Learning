// Shared helpers for smoke checks. Each feature adds scripts/smoke/NN-<feature>.ts and lists it in index.ts.
export interface TgCall { method: string; body: any; result?: any }

export interface Smoke {
  OWNER: string;
  base: string;
  /** Every call the Worker made to the (fake) Telegram API; clear with `calls.length = 0`. */
  calls: TgCall[];
  check(ok: boolean, label: string): void;
  /** POST a Telegram update to the webhook. */
  post(update: object, secret?: string): Promise<Response>;
  /** A text message update from `from` (default: the owner). */
  msg(text: string, from?: number): object;
  /** Signed Mini App launch data for a user. */
  initData(userId: number, token?: string): Promise<string>;
  /** Owner's launch data. */
  me: string;
  /** Mini App API call; `auth` null = no Authorization header. */
  api(path: string, auth: string | null, init?: RequestInit): Promise<Response>;
  /** Values earlier checks leave for later ones. */
  state: Record<string, unknown>;
  /** Set by the fake Telegram server: the next response for a method (e.g. getFile). */
  fakeResults: Record<string, unknown>;
}
