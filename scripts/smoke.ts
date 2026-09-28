// End-to-end check of the Worker on this Mac: real Worker + local D1, fake Telegram API.
// Usage: pnpm smoke     (no accounts or secrets needed)
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { signInitData } from "../packages/core/src/index.ts";
import type { Smoke } from "./smoke/context.ts";
import { CHECKS } from "./smoke/index.ts";
import { createFakeLlm, fakeLlmVars } from "./smoke/fake-llm.ts";

const workerDir = fileURLToPath(new URL("../apps/worker", import.meta.url));
const persist = mkdtempSync(join(tmpdir(), "el-smoke-"));
const OWNER = "42", SECRET = "smoke-secret", PORT = 8788, TG_PORT = 8799;

// --- fake Telegram ---
const calls: { method: string; body: any }[] = [];
let pollSeq = 0;
const fakeResults: Record<string, unknown> = {}; // checks can set custom Telegram responses (e.g. getFile)
const { handle: fakeLlm, state: llm } = createFakeLlm(calls);
const tg = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (fakeLlm(req.url!, raw, res)) return; // fake AI providers + Telegram file downloads (scripts/smoke/fake-llm.ts)
    const method = req.url!.split("/").pop()!;
    calls.push({ method, body: JSON.parse(raw || "{}") });
    const result =
      method in fakeResults ? fakeResults[method] : method === "sendPoll" ? { message_id: 1, poll: { id: `poll-${++pollSeq}` } } : { message_id: 1 };
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, result }));
  });
}).listen(TG_PORT);

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
};

execFileSync("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "everyday-learning", "--local", "--persist-to", persist], {
  cwd: workerDir,
  stdio: "ignore",
  env: { ...process.env, CI: "1" },
});

const vars = { TELEGRAM_BOT_TOKEN: "test", TELEGRAM_USER_ID: OWNER, TELEGRAM_WEBHOOK_SECRET: SECRET, TELEGRAM_API_BASE: `http://127.0.0.1:${TG_PORT}`, ...fakeLlmVars(TG_PORT) };
const dev = spawn(
  "pnpm",
  ["exec", "wrangler", "dev", "--port", String(PORT), "--persist-to", persist, "--test-scheduled",
   ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])],
  { cwd: workerDir, stdio: ["ignore", "pipe", "pipe"] },
);
let devLog = "";
dev.stdout.on("data", (d) => (devLog += d));
dev.stderr.on("data", (d) => (devLog += d));

const base = `http://127.0.0.1:${PORT}`;
const post = (update: object, secret = SECRET) =>
  fetch(`${base}/tg/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
    body: JSON.stringify(update),
  });
const msg = (text: string, from = Number(OWNER)) => ({ update_id: Date.now(), message: { message_id: 1, from: { id: from }, chat: { id: from }, text } });

try {
  for (let i = 0; ; i++) {
    try { if ((await fetch(`${base}/health`)).ok) break; } catch {}
    if (i > 60) throw new Error("wrangler dev did not start:\n" + devLog);
    await new Promise((r) => setTimeout(r, 500));
  }

  const initData = async (userId: number, token = "test") =>
    signInitData({ user: JSON.stringify({ id: userId, first_name: "T" }), auth_date: String(Math.floor(Date.now() / 1000)) }, token);
  const api = async (path: string, auth: string | null, init: RequestInit = {}) =>
    fetch(`${base}/api${path}`, { ...init, headers: { "content-type": "application/json", ...(auth !== null && { authorization: `tma ${auth}` }) } });
  const t: Smoke = { OWNER, base, calls, check, post, msg, initData, api, me: await initData(Number(OWNER)), state: {}, fakeResults, llm };

  for (const c of CHECKS) {
    console.log(`— ${c.name}`);
    await c.run(t);
  }

  const cron = await fetch(`${base}/__scheduled?cron=*/15+*+*+*+*`);
  check(cron.ok, "cron handler runs");
} finally {
  dev.kill();
  tg.close();
  rmSync(persist, { recursive: true, force: true });
}
if (failures) {
  console.error(`\n${failures} check(s) failed. Worker log:\n${devLog.slice(-3000)}`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
process.exit(0);
