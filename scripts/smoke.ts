// End-to-end check of the Worker on this Mac: real Worker + local D1, fake Telegram API.
// Usage: pnpm smoke     (no accounts or secrets needed)
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = fileURLToPath(new URL("../apps/worker", import.meta.url));
const persist = mkdtempSync(join(tmpdir(), "el-smoke-"));
const OWNER = "42", SECRET = "smoke-secret", PORT = 8788, TG_PORT = 8799;

// --- fake Telegram ---
const calls: { method: string; body: any }[] = [];
let pollSeq = 0;
const tg = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const method = req.url!.split("/").pop()!;
    calls.push({ method, body: JSON.parse(raw || "{}") });
    const result = method === "sendPoll" ? { message_id: 1, poll: { id: `poll-${++pollSeq}` } } : { message_id: 1 };
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

const vars = { TELEGRAM_BOT_TOKEN: "test", TELEGRAM_USER_ID: OWNER, TELEGRAM_WEBHOOK_SECRET: SECRET, TELEGRAM_API_BASE: `http://127.0.0.1:${TG_PORT}` };
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
    try { if ((await fetch(base)).ok) break; } catch {}
    if (i > 60) throw new Error("wrangler dev did not start:\n" + devLog);
    await new Promise((r) => setTimeout(r, 500));
  }

  check((await post(msg("/today"), "wrong")).status === 403, "wrong webhook secret → 403");

  calls.length = 0;
  await post(msg("/today", 999));
  check(calls.length === 0, "messages from other users are ignored");

  await post(msg("/today"));
  check(calls.some((c) => c.method === "sendMessage" && c.body.text.includes("К повторению")), "/today answers the owner");

  calls.length = 0;
  await post(msg("/lesson"));
  const polls = calls.filter((c) => c.method === "sendPoll");
  const lesson = calls.find((c) => c.method === "sendMessage");
  check(!!lesson?.body.text.includes("laikas"), "morning lesson lists the first Lithuanian word");
  check(polls.length === 8, `8 quiz polls sent (5 LT + 3 ES), got ${polls.length}`);
  check(polls.every((p) => p.body.type === "quiz" && p.body.is_anonymous === false), "polls are non-anonymous quizzes");

  // answer the first poll correctly, the second wrongly, the first again (duplicate)
  const p1 = polls[0]!.body, p2 = polls[1]!.body;
  const ans = (id: string, option: number) => post({ update_id: Date.now(), poll_answer: { poll_id: id, user: { id: Number(OWNER) }, option_ids: [option] } });
  await ans("poll-1", p1.correct_option_id);
  await ans("poll-2", (p2.correct_option_id + 1) % p2.options.length);
  await ans("poll-1", p1.correct_option_id);

  calls.length = 0;
  await post(msg("/today"));
  const today = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(today.includes("Ответов сегодня: 2"), "two answers recorded, duplicate ignored");
  check(/К повторению сейчас: [1-9]/.test(today), "the wrong answer is due again soon");

  calls.length = 0;
  await post(msg("/lesson"));
  const lesson2 = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(lesson2.includes("tikėtis") && !lesson2.includes("<b>laikas</b>"), "a second lesson brings the next words (tikėtis…), not the same ones");

  calls.length = 0;
  await post(msg("/today"));
  const today2 = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(!today2.includes("Утренний урок придёт"), "/lesson counts as today's morning lesson (no second one from cron)");

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
