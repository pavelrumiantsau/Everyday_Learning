// Validates Telegram Mini App launch data (window.Telegram.WebApp.initData).
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// secret = HMAC_SHA256(key: "WebAppData", data: botToken); hash = hex(HMAC_SHA256(key: secret, data: data_check_string))

const enc = new TextEncoder();

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(data));
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

function dataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

export async function signInitData(fields: Record<string, string>, botToken: string): Promise<string> {
  const params = new URLSearchParams(fields);
  const secret = await hmac(enc.encode("WebAppData"), botToken);
  params.set("hash", toHex(await hmac(secret, dataCheckString(params))));
  return params.toString();
}

export type InitDataResult = { ok: true; userId: string } | { ok: false; reason: string };

/** Checks the signature, the age (default 24 h) and that a user is present. */
export async function verifyInitData(
  initData: string,
  botToken: string,
  now = Date.now(),
  maxAgeSeconds = 24 * 60 * 60,
): Promise<InitDataResult> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no hash" };

  const secret = await hmac(enc.encode("WebAppData"), botToken);
  const expected = toHex(await hmac(secret, dataCheckString(params)));
  if (!timingSafeEqual(expected, hash)) return { ok: false, reason: "bad signature" };

  const authDate = Number(params.get("auth_date"));
  if (!authDate || now / 1000 - authDate > maxAgeSeconds) return { ok: false, reason: "expired" };

  try {
    const user = JSON.parse(params.get("user") ?? "") as { id?: number };
    if (!user.id) return { ok: false, reason: "no user" };
    return { ok: true, userId: String(user.id) };
  } catch {
    return { ok: false, reason: "bad user" };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
