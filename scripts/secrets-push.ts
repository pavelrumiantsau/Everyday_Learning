// Uploads the secrets from apps/worker/.dev.vars to Cloudflare in one go (`wrangler secret bulk`).
// Usage: pnpm secrets:push
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const workerDir = fileURLToPath(new URL("../apps/worker", import.meta.url));
const SECRET_KEYS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_USER_ID", "TELEGRAM_WEBHOOK_SECRET", "GEMINI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"];
const REQUIRED = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_USER_ID", "TELEGRAM_WEBHOOK_SECRET"];

export function readDevVars(): Record<string, string> {
  const file = join(workerDir, ".dev.vars");
  if (!existsSync(file)) {
    console.error("✗ apps/worker/.dev.vars not found. Copy .dev.vars.example to .dev.vars and fill it in (SETUP.md step 4.3).");
    process.exit(1);
  }
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const vars = readDevVars();
  const missing = REQUIRED.filter((k) => !vars[k]);
  if (missing.length) {
    console.error(`✗ Fill these in apps/worker/.dev.vars first: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (!/^\d+$/.test(vars.TELEGRAM_USER_ID!)) {
    console.error("✗ TELEGRAM_USER_ID must be the number from @userinfobot, not your @username.");
    process.exit(1);
  }
  const secrets = Object.fromEntries(SECRET_KEYS.filter((k) => vars[k]).map((k) => [k, vars[k]!]));
  const tmp = join(tmpdir(), `el-secrets-${process.pid}.json`);
  writeFileSync(tmp, JSON.stringify(secrets), { mode: 0o600 });
  try {
    execFileSync("pnpm", ["exec", "wrangler", "secret", "bulk", tmp], { cwd: workerDir, stdio: "inherit" });
    console.log(`✓ Uploaded: ${Object.keys(secrets).join(", ")}`);
  } finally {
    rmSync(tmp, { force: true });
  }
}
