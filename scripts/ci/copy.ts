// A colleague's personal copy (docs/EXTENSION-PLAN.md §3): everything the Setup / Update workflows need on Cloudflare
// and Telegram, so the colleague only pastes three secrets and clicks Run. Never used by the owner's repo.
//
//   tsx scripts/ci/copy.ts configure          find the Cloudflare account, register a workers.dev subdomain if needed,
//                                             find or create the D1 database, write their ids into wrangler.toml
//                                             (CI workspace only, never committed); outputs url=… (or skip=true without a token)
//   tsx scripts/ci/copy.ts secrets            new webhook secret + claim code → Worker secrets, webhook, menus,
//                                             claim link in the run summary
//   tsx scripts/ci/copy.ts menus              command menu + ▶ button only (after an update)
//   tsx scripts/ci/copy.ts reset-owner        forget the bound owner (the next claim link binds again)
//   tsx scripts/ci/copy.ts --self-test        pure helpers only, no network
//
// Env: CLOUDFLARE_API_TOKEN, TELEGRAM_BOT_TOKEN, GROQ_API_KEY (optional), CLOUDFLARE_ACCOUNT_ID (only if the token sees
// several accounts), GITHUB_REPOSITORY_OWNER, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY (set by GitHub Actions).
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setMenus, setWebhook, telegram } from "../telegram-config.ts";

const OWNER_REPO = "pavelrumiantsau/Everyday_Learning";
const WORKER_NAME = "everyday-learning";
const DB_NAME = "everyday-learning";
const workerDir = fileURLToPath(new URL("../../apps/worker", import.meta.url));
const tomlPath = join(workerDir, "wrangler.toml");

// ---------- pure helpers (covered by --self-test) ----------

/** wrangler.toml with this copy's account, database and URL; comments and everything else stay. */
export function rewriteToml(toml: string, ids: { accountId: string; databaseId: string; url: string }): string {
  const set = (s: string, key: string, value: string) => {
    const re = new RegExp(`^(${key}\\s*=\\s*)"[^"]*"`, "m");
    if (!re.test(s)) throw new Error(`wrangler.toml: ${key} not found`);
    return s.replace(re, `$1"${value}"`);
  };
  return set(set(set(toml, "account_id", ids.accountId), "database_id", ids.databaseId), "WEBAPP_URL", ids.url);
}

/** A workers.dev subdomain from the GitHub user name: lowercase letters, digits and dashes, 3–63 characters. */
export function subdomainFor(githubOwner: string, suffix = ""): string {
  const base = githubOwner.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "learner";
  return `${base}-learn${suffix ? `-${suffix}` : ""}`;
}

export const workerUrl = (subdomain: string) => `https://${WORKER_NAME}.${subdomain}.workers.dev`;

/** Telegram deep-link parameters allow A–Z, a–z, 0–9, _ and - (up to 64 characters). */
export const newClaimCode = () => randomBytes(18).toString("base64url");

// ---------- GitHub Actions output ----------

const output = (key: string, value: string) => process.env.GITHUB_OUTPUT && appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
const summary = (markdown: string) =>
  process.env.GITHUB_STEP_SUMMARY ? appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`) : console.log(markdown);

function fail(message: string): never {
  console.error(`✗ ${message}`);
  summary(`### ✗ Ошибка\n\n${message}`);
  process.exit(1);
}

// ---------- Cloudflare ----------

async function cf<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; result: T; errors: { code: number; message: string }[] }> {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json", ...init.headers },
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; result?: T; errors?: { code: number; message: string }[] };
  return { ok: res.ok && !!data.success, result: data.result as T, errors: data.errors ?? [] };
}
const cfErrors = (e: { code: number; message: string }[]) => e.map((x) => `${x.code}: ${x.message}`).join("; ") || "no details";

async function accountId(): Promise<string> {
  const verify = await cf<{ status: string }>("/user/tokens/verify");
  if (!verify.ok || verify.result?.status !== "active") {
    fail("CLOUDFLARE_API_TOKEN не принят Cloudflare. Создайте токен заново (шаг 3 инструкции) и обновите секрет в GitHub.");
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const accounts = await cf<{ id: string; name: string }[]>("/accounts");
  if (!accounts.ok || !accounts.result?.length) {
    fail("Токен не видит ни одного аккаунта Cloudflare. При создании токена используйте шаблон «Edit Cloudflare Workers».");
  }
  if (accounts.result.length > 1) {
    fail(`Токен видит несколько аккаунтов (${accounts.result.map((a) => a.name).join(", ")}). Добавьте секрет CLOUDFLARE_ACCOUNT_ID с нужным Account ID.`);
  }
  return accounts.result[0]!.id;
}

async function ensureSubdomain(account: string): Promise<string> {
  const current = await cf<{ subdomain: string }>(`/accounts/${account}/workers/subdomain`);
  if (current.ok && current.result?.subdomain) return current.result.subdomain;
  for (const suffix of ["", randomBytes(2).toString("hex"), randomBytes(3).toString("hex")]) {
    const name = subdomainFor(process.env.GITHUB_REPOSITORY_OWNER ?? "", suffix);
    const created = await cf<{ subdomain: string }>(`/accounts/${account}/workers/subdomain`, { method: "PUT", body: JSON.stringify({ subdomain: name }) });
    if (created.ok) {
      console.log(`✓ Registered workers.dev subdomain: ${name}`);
      return created.result.subdomain ?? name;
    }
    console.log(`  subdomain ${name} not available (${cfErrors(created.errors)})`);
  }
  fail("Не удалось зарегистрировать адрес workers.dev. Откройте dash.cloudflare.com → Workers & Pages один раз (он предложит выбрать адрес) и запустите Setup снова.");
}

async function ensureDatabase(account: string): Promise<string> {
  const list = await cf<{ uuid: string; name: string }[]>(`/accounts/${account}/d1/database?name=${DB_NAME}`);
  if (!list.ok) fail(`Нет доступа к базам D1 (${cfErrors(list.errors)}). Добавьте токену право «D1: Edit» (шаг 3 инструкции).`);
  const found = list.result.find((d) => d.name === DB_NAME);
  if (found) return found.uuid;
  const created = await cf<{ uuid: string }>(`/accounts/${account}/d1/database`, { method: "POST", body: JSON.stringify({ name: DB_NAME }) });
  if (!created.ok) fail(`Не удалось создать базу D1 (${cfErrors(created.errors)}).`);
  console.log(`✓ Created D1 database ${DB_NAME}`);
  return created.result.uuid;
}

// ---------- commands ----------

function refuseOwnerRepo() {
  if (process.env.GITHUB_REPOSITORY === OWNER_REPO) fail("Это исходный репозиторий, а не личная копия: здесь эти шаги не выполняются.");
}

async function configure() {
  refuseOwnerRepo();
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.log("No CLOUDFLARE_API_TOKEN secret yet: nothing to deploy (run Setup after adding the secrets).");
    output("skip", "true");
    return;
  }
  const account = await accountId();
  // The committed wrangler.toml names the original bot's account: a copy must never deploy over it (same Worker and D1 names).
  const original = /^account_id\s*=\s*"([^"]+)"/m.exec(readFileSync(tomlPath, "utf8"))?.[1];
  if (account === original) fail("Этот токен Cloudflare — от аккаунта исходного бота. Для копии нужен свой аккаунт Cloudflare (шаг 3 инструкции).");
  const subdomain = await ensureSubdomain(account);
  const databaseId = await ensureDatabase(account);
  const url = workerUrl(subdomain);
  writeFileSync(tomlPath, rewriteToml(readFileSync(tomlPath, "utf8"), { accountId: account, databaseId, url: `${url}/` }));
  console.log(`✓ wrangler.toml → account ${account.slice(0, 6)}…, database ${databaseId.slice(0, 8)}…, ${url}`);
  output("url", url);
}

function needBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) fail("Нет секрета TELEGRAM_BOT_TOKEN (шаг 1 и 5 инструкции).");
  if (!/^\d+:[\w-]{30,}$/.test(token)) fail("TELEGRAM_BOT_TOKEN выглядит неправильно: скопируйте токен от @BotFather целиком (вида 1234567890:AA…).");
  return token;
}

const urlFromToml = () => /^WEBAPP_URL\s*=\s*"([^"]+)"/m.exec(readFileSync(tomlPath, "utf8"))![1]!.replace(/\/$/, "");

async function groqKeyWorks(key: string): Promise<boolean> {
  const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { authorization: `Bearer ${key}` } }).catch(() => null);
  return !!res?.ok;
}

async function secrets() {
  refuseOwnerRepo();
  const token = needBotToken();
  const url = urlFromToml();
  const call = telegram(token);
  const me = await call<{ username: string }>("getMe").catch(() => fail("Telegram не принял TELEGRAM_BOT_TOKEN. Проверьте токен у @BotFather (/mybots → API Token)."));

  const webhookSecret = randomBytes(32).toString("hex");
  const claimCode = newClaimCode();
  const values: Record<string, string> = { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: webhookSecret, CLAIM_CODE: claimCode };
  const groq = process.env.GROQ_API_KEY?.trim();
  let aiNote = "ИИ-функции выключены: секрета GROQ_API_KEY нет (его можно добавить позже и запустить Setup снова).";
  if (groq) {
    if (await groqKeyWorks(groq)) {
      values.GROQ_API_KEY = groq;
      aiNote = "ИИ-функции включены (Groq).";
    } else {
      aiNote = "⚠️ GROQ_API_KEY не принят Groq — ИИ-функции пока выключены. Создайте ключ заново и запустите Setup снова.";
    }
  }
  const tmp = join(tmpdir(), `el-secrets-${process.pid}.json`);
  writeFileSync(tmp, JSON.stringify(values), { mode: 0o600 });
  try {
    execFileSync("pnpm", ["exec", "wrangler", "secret", "bulk", tmp], { cwd: workerDir, stdio: ["ignore", "ignore", "inherit"] });
  } finally {
    rmSync(tmp, { force: true });
  }
  console.log(`✓ Worker secrets: ${Object.keys(values).join(", ")}`);

  await setWebhook(call, url, webhookSecret);
  await setMenus(call, url, true);
  console.log(`✓ Telegram: webhook, commands and ▶ button for @${me.username}`);

  summary(
    [
      "## ✅ Бот готов",
      "",
      `**Последний шаг:** откройте эту ссылку на телефоне (или в Telegram на компьютере) и нажмите **Start**:`,
      "",
      `### 👉 https://t.me/${me.username}?start=${claimCode}`,
      "",
      "Бот привяжется к вашему аккаунту Telegram, и дальше будет отвечать только вам. Не пересылайте эту ссылку другим.",
      "",
      `- Бот: @${me.username}`,
      `- Адрес приложения: ${url}`,
      `- ${aiNote}`,
    ].join("\n"),
  );
}

async function menus() {
  refuseOwnerRepo();
  const token = needBotToken();
  await setMenus(telegram(token), urlFromToml(), true);
  console.log("✓ Telegram command menu and ▶ button updated");
}

function resetOwner() {
  refuseOwnerRepo();
  execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", DB_NAME, "--remote", "--command", "DELETE FROM settings WHERE key = 'owner'"], {
    cwd: workerDir,
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log("✓ Owner binding cleared: the new claim link binds the bot again");
}

function selfTest() {
  const toml = 'name = "x"\naccount_id = "aaa"   # comment\n[vars]\nWEBAPP_URL = "https://old/"\n[[d1_databases]]\ndatabase_id = "bbb"   # not a secret\n';
  const out = rewriteToml(toml, { accountId: "A1", databaseId: "D1", url: "https://new/" });
  const expect = 'name = "x"\naccount_id = "A1"   # comment\n[vars]\nWEBAPP_URL = "https://new/"\n[[d1_databases]]\ndatabase_id = "D1"   # not a secret\n';
  if (out !== expect) throw new Error(`rewriteToml:\n${out}`);
  const real = rewriteToml(readFileSync(tomlPath, "utf8"), { accountId: "A", databaseId: "D", url: "https://u/" });
  if (!real.includes('account_id = "A"') || !real.includes('database_id = "D"') || !real.includes('WEBAPP_URL = "https://u/"')) throw new Error("real wrangler.toml");
  if (subdomainFor("Pavel_Rumiantsau") !== "pavel-rumiantsau-learn") throw new Error(subdomainFor("Pavel_Rumiantsau"));
  if (subdomainFor("--", "ab12") !== "learner-learn-ab12") throw new Error(subdomainFor("--", "ab12"));
  if (!/^[A-Za-z0-9_-]{24}$/.test(newClaimCode())) throw new Error("claim code");
  console.log("✓ copy.ts self-test passed");
}

const commands: Record<string, () => unknown> = { configure, secrets, menus, "reset-owner": resetOwner, "--self-test": selfTest };
const command = commands[process.argv[2] ?? ""];
if (!command) fail(`usage: tsx scripts/ci/copy.ts ${Object.keys(commands).join(" | ")}`);
await command();
