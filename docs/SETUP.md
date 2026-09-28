# Setup Guide — step by step

This guide takes you from zero to a working bot. It assumes you've **never used Cloudflare or an AI API** before.
Each step says who does it:

- 👤 **You**: account sign-ups, anything in a browser or in Telegram, copying secrets.
- 🤖 **Claude Code**: commands in the terminal. You can ask Claude Code to run these for you, and it will stop and ask when it needs a value from you.

> **Golden rule for secrets:** tokens and keys go **only** into a password manager, `wrangler secret`, GitHub Secrets,
> or the git-ignored file `.dev.vars`. Never paste them into code, the chat with the bot, or a commit.
> This repo is public.

Total time: about **1.5–2 hours**, spread over the steps below. Steps 1–4 can be done in one evening.
Website menus change from time to time. If a button has a slightly different name, look for the closest match.

---

## Step 0 — Tools on the Mac (15 min) 🤖

```bash
# Homebrew (skip if `brew --version` works)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node gh pnpm       # Node.js (22 or newer), GitHub CLI, pnpm
gh auth login                   # 👤 choose GitHub.com → HTTPS → log in with browser

# check
node --version   # v22 or newer
pnpm --version
gh auth status
```
Python (`python3 --version`) is already on macOS. It's needed for audio (see "Audio" under Step 7).

✅ **Done when** all three version commands print a version and `gh auth status` says you're logged in.

---

## Step 1 — Create the Telegram bot (10 min) 👤

1. In Telegram, open **@BotFather** (blue checkmark) → send `/newbot`.
2. **Name** (display name, can be anything): e.g. `Everyday Learning`.
3. **Username** (must be unique and end in `bot`): e.g. `pavel_everyday_learning_bot`.
4. BotFather replies with a **token** like `1234567890:AA...`. **Copy it into your password manager** as *Telegram bot token*.
   Anyone with this token controls the bot. If it ever leaks: BotFather → `/revoke`.
5. Find **your Telegram user ID**: open **@userinfobot** → press Start → it replies with your numeric `Id`.
   Save it as *Telegram user ID*. The bot will answer **only** this ID.
6. Optional: BotFather → `/setuserpic` (an icon) and `/setdescription`.

✅ **Done when** you have the bot token and your user ID saved, and you can open your bot in Telegram (it won't reply yet).

---

## Step 2 — AI API key: Groq (10 min) 👤

**Groq** (with a **q**, not xAI's *Grok*) runs open AI models, such as OpenAI's GPT-OSS, very fast. Its **free tier** needs
no credit card. The bot uses it for tutor chat and feedback (from weeks 5–6).

1. Go to **https://console.groq.com** and sign in (Google or GitHub account is fine).
2. Left menu → **API Keys** → **Create API Key** → name it `everyday-learning` → copy it.
   Groq keys start with **`gsk_`**. Save it in your password manager as *Groq API key*.
3. Test it 🤖 (paste your key when asked, and don't save it in a file):
   ```bash
   read -s GROQ_API_KEY && export GROQ_API_KEY
   curl -s https://api.groq.com/openai/v1/chat/completions \
     -H "Authorization: Bearer $GROQ_API_KEY" -H "Content-Type: application/json" \
     -d '{"model":"openai/gpt-oss-120b","messages":[{"role":"user","content":"Исправь ошибку и объясни по-русски: Aš eina į parduotuvę."}]}' \
     | head -c 1200
   ```
   You should see a JSON answer that corrects *eina → einu*.
4. See which models your key can use (Groq retires old ones every few months, e.g. its Llama models in 2026):
   ```bash
   curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" | grep '"id"'
   ```
   The bot keeps model names in one config file, so switching is a one-line change.
   The current list, with limits, is at **https://console.groq.com/docs/models**.
5. Your free-tier limits are in the console under **Settings → Limits**. The bot needs a few dozen requests a day, far below them.

| Error | Meaning |
|---|---|
| `401 invalid_api_key` | Key copied wrong, or it's an xAI key (`xai-…`). Create a new one on console.groq.com |
| `404 model_not_found` / `model_decommissioned` | Model retired. Pick another from the list in 2.4 |
| `429 rate_limit_exceeded` | Too many requests in a short time. Wait a minute |
| `503` | Temporary overload. Try again in a few minutes |

**Optional second provider: Gemini** (Google AI Studio, **https://aistudio.google.com** → **Get API key**, key starts
with `AIza…`, don't enable billing). The bot can use it as an automatic fallback when Groq is busy. In September 2026
new keys often got `503 high demand` errors, so it's not required. If you add it later, check the model names with:
`curl -s -H "x-goog-api-key: $GEMINI_API_KEY" "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" | grep '"name"' | grep -i flash`

✅ **Done when** the Groq `curl` test returns a Lithuanian correction.

---

## Step 3 — Cloudflare account (15 min) 👤 + 🤖

Cloudflare Workers run your bot's code on Cloudflare's servers. **The free plan needs no credit card**, and
**it can't bill you**: if a limit is ever reached, requests fail for the rest of the day. There is no charge.

1. 👤 Sign up at **https://dash.cloudflare.com/sign-up** → verify your email.
   You don't need to add a website or domain. Skip anything about domains or DNS.
2. 👤 In the left menu open **Workers & Pages** (under *Compute*). On first visit Cloudflare asks you to choose
   a **workers.dev subdomain**, e.g. `pavel-learn`. Your bot will live at
   `https://everyday-learning.pavel-learn.workers.dev`. The plan stays **Free**.
3. 🤖 Log the command-line tool into your account (a browser window opens and you click **Allow**):
   ```bash
   cd ~/Downloads/"Everyday learning"
   pnpm install                 # installs wrangler (Cloudflare's CLI) as a project tool (already done if Claude Code set up the project)
   pnpm wrangler login
   pnpm wrangler whoami         # shows your account name and Account ID
   ```
4. 👤 Save the **Account ID** from `whoami` in your password manager (it's not secret, but you'll need it in step 6).

✅ **Done when** `pnpm wrangler whoami` shows your email and Account ID.

---

## Step 4 — Database, first deploy, secrets, connect Telegram (20 min) 🤖 (+ 👤 filling in one file)

Everything below runs from the project folder (`cd ~/Downloads/"Everyday learning"`).

1. **Create the database** (D1 = a small SQL database on Cloudflare):
   ```bash
   pnpm wrangler d1 create everyday-learning
   ```
   It prints a `database_id`. Put it into [apps/worker/wrangler.toml](../apps/worker/wrangler.toml) in place of
   `REPLACE_WITH_ID_FROM_d1_create` (Claude Code can do this). The ID isn't secret, so committing it is fine.
2. **Create the tables:**
   ```bash
   pnpm db:migrate
   ```
3. **Your time zone and reminder times** (not secret): edit [config/schedule.yaml](../config/schedule.yaml).
   `timezone` is an IANA name such as `Europe/Vilnius`; defaults are 07:50 / 20:30.
4. **First deploy:**
   ```bash
   pnpm deploy:worker
   ```
   It prints your URL, e.g. `https://everyday-learning.pavel-learn.workers.dev`. Open it in a browser and you should see
   *"Everyday Learning is running."* (The bot can't work yet because it has no secrets. That's the next step.)
5. **Secrets: fill in one file, upload once.**
   ```bash
   cp apps/worker/.dev.vars.example apps/worker/.dev.vars
   openssl rand -hex 32          # prints a random webhook secret to paste below
   code apps/worker/.dev.vars    # opens it in VS Code
   ```
   👤 Fill in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_USER_ID` (step 1), `TELEGRAM_WEBHOOK_SECRET` (the random value above),
   `GROQ_API_KEY` and optionally `GEMINI_API_KEY` (step 2), and `WORKER_URL` (step 4.4). Save.
   `.dev.vars` is git-ignored, so it never reaches GitHub. Then upload the secrets to Cloudflare, where they're stored encrypted:
   ```bash
   pnpm secrets:push
   ```
6. **Connect Telegram to the Worker** (tells Telegram to deliver your messages to it instantly):
   ```bash
   pnpm setup:telegram
   ```
   It sets the webhook (with the secret), the command menu (`/today`, `/lesson`, `/help`) and the **▶ Learn** button
   that opens the Mini App, then prints the webhook
   status: your URL, `pending_update_count: 0`, `last_error_message: none`.
7. 👤 Open your bot in Telegram → **Start** → `/today`. The reply should arrive in 1–2 seconds. Then try `/lesson`
   to get today's lesson and quiz polls right away. From tomorrow, it arrives by itself at your morning time.

✅ **Done when** `/today` answers instantly, `/lesson` sends words + quizzes, and a message from any *other* Telegram account gets no reply.

**Tip, testing without Telegram:** `pnpm smoke` runs the whole bot on your Mac against a fake Telegram and a
local database, and prints a ✓/✗ checklist. It's useful after any code change.

### Where to look in the Cloudflare dashboard
| You want to… | Go to |
|---|---|
| See live logs | Terminal: `pnpm wrangler tail` (then message the bot), or Dashboard → Workers & Pages → `everyday-learning` → **Logs** |
| Check the cron schedule | Worker → **Settings → Trigger events** (shows `*/15 * * * *`) |
| Look at your data | **Storage & Databases → D1** → `everyday-learning` → **Console** (run e.g. `SELECT * FROM activity_day LIMIT 10;`) |
| See usage vs free limits | Worker → **Metrics**; account **Workers & Pages → Overview** |
| Roll back a bad deploy | Worker → **Deployments** → pick the previous version → **Rollback** |

---

## Step 5 — GitHub: automatic deploys and nightly backups (15 min) 👤 + 🤖

From here on, every push to `main` that passes the checks goes live by itself, and your progress is copied
every night to the **private** repo `Everyday_Learning-data`. You need two tokens, both created in the browser.

1. 🤖 Private data repo, already created: https://github.com/pavelrumiantsau/Everyday_Learning-data
2. 👤 **Cloudflare API token** (lets GitHub Actions deploy and read the database):
   Cloudflare dashboard → profile icon (top right) → **My Profile → API Tokens → Create Token** →
   template **"Edit Cloudflare Workers"** → **Use template**.
   - Under **Permissions**, click **+ Add more** and add **Account → D1 → Edit** (the template doesn't include it).
   - **Account Resources:** Include → your account. **Zone Resources:** leave as is (you have no domains).
   - **Continue to summary → Create Token** → copy the token (shown once) into your password manager as *Cloudflare API token (GitHub)*.
3. 👤 **GitHub token for backups** (lets the backup job write to the private repo, and nothing else):
   github.com → your avatar → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Name: `everyday-learning-backup`. Expiration: **1 year** (add a calendar reminder).
   - **Repository access:** *Only select repositories* → `Everyday_Learning-data`.
   - **Permissions → Repository permissions → Contents: Read and write.** (Metadata: Read-only is added automatically.)
   - **Generate token** → copy it into your password manager as *GitHub backup token*.
4. 👤 **Store both as GitHub Secrets** of the public repo. Type these into the Claude Code prompt one at a time
   (the `!` runs them in your terminal). Each one asks you to paste the value, which isn't shown:
   ```bash
   ! gh secret set CLOUDFLARE_API_TOKEN -R pavelrumiantsau/Everyday_Learning
   ! gh secret set DATA_REPO_TOKEN -R pavelrumiantsau/Everyday_Learning
   ```
   `gh secret list -R pavelrumiantsau/Everyday_Learning` shows the names (never the values).
5. 🤖 Claude Code pushes the workflows and runs a test deploy and a first backup.

✅ **Done when** the **Actions** tab shows `ci` (check + deploy) green, and `d1/everyday-learning.sql` appears in `Everyday_Learning-data`.

**Later (weeks 7–8), not needed now:** a `CLAUDE_CODE_OAUTH_TOKEN` secret (from `claude setup-token`) for the automated
content batches and weekly writing review. It's left out for now so it doesn't sit unused and expire.

### Restoring from a backup (if ever needed) 🤖
```bash
git clone https://github.com/pavelrumiantsau/Everyday_Learning-data /tmp/el-data
pnpm wrangler d1 execute everyday-learning --remote --file /tmp/el-data/d1/everyday-learning.sql
```
Restore into an **empty** database (create a new one with `pnpm wrangler d1 create …` first), because the file recreates the tables.
Older versions: `git log d1/everyday-learning.sql` in the data repo, then `git show <commit>:d1/everyday-learning.sql > old.sql`.
Cloudflare also keeps its own point-in-time history of D1 (*Time Travel*, see `pnpm wrangler d1 time-travel --help`).

---

## Step 6 — Claude app tutor Project (10 min) 👤

For the twice-weekly Lithuanian voice sessions (covered by your subscription).

1. claude.ai (or the Claude iPhone app) → **Projects → New project** → name: `Lietuvių korepetitorius`.
2. Paste the instructions from [prompts/tutor/claude-project.md](../prompts/tutor/claude-project.md) into the project instructions.
   They cover your level, this quarter's grammar topics, "correct me in Russian after each reply", and "keep a list of my typical mistakes".
3. Every quarter, update the topic list in that file and paste it again (the bot reminds you).
4. On the iPhone, open a chat in this Project → tap the **voice** button → speak Lithuanian.
   Try a short test first. If voice recognition handles Lithuanian poorly, use text chat and the bot's voice-message feedback instead.

✅ **Done when** a 5-minute conversation works and you get corrections in Russian.

---

## Step 7 — Mini App (after weeks 2–3 of the build) 👤

Nothing to create: the Worker serves the Mini App itself. After the deploy that adds it:
1. In Telegram, open the bot → tap **▶ Learn** (bottom left). The Mini App opens.
2. Test it on the **iPhone** and on **Telegram for Mac**. Your progress should match on both.
3. Optional: BotFather → `/newapp` gives the Mini App a direct link, e.g. `t.me/<bot>/learn`, which you can pin in a chat.

### Audio (pronunciation) 🤖
The 🔊 buttons play mp3 files made with the free `edge-tts` voices (Lithuanian `lt-LT-OnaNeural`, Spanish
`es-ES-ElviraNeural`, French `fr-FR-DeniseNeural`). The files are **committed to git** (`apps/miniapp/public/audio/`),
so deploys and CI don't need Python. One-time setup on the Mac:
```bash
python3 -m venv .cache/venv && .cache/venv/bin/pip install edge-tts
```
After adding or changing content, run `pnpm content:audio`, then commit `apps/miniapp/public/audio`. It only generates
files whose text changed (tracked in `audio/manifest.json`) and deletes files of removed items; a word takes ~1 s.
New content without audio still works — the 🔊 button just doesn't appear for it (`pnpm smoke` prints a reminder).
To see what would change without generating anything: `pnpm build:content && pnpm exec tsx scripts/audio-texts.ts .cache/audio-texts.json && .cache/venv/bin/python scripts/tts.py .cache/audio-texts.json --dry-run`.

---

## Troubleshooting
| Symptom | Check / fix |
|---|---|
| Bot doesn't reply | `pnpm setup:telegram --info` → look at `last_error_message`. `403` → the webhook secret doesn't match: check `.dev.vars`, then `pnpm secrets:push` and `pnpm setup:telegram` again. Then run `pnpm wrangler tail` and send a message |
| Bot replies to nobody | Wrong `TELEGRAM_USER_ID`. Check @userinfobot again, fix `.dev.vars`, `pnpm secrets:push` |
| Mini App says "unauthorized" | It was opened outside Telegram (e.g. in Safari), or the bot token changed. Open it via **▶ Learn** |
| AI answers stop, with `429` in the logs | Groq rate limit. Wait a minute; if Gemini is configured, the bot switches to it automatically. Limits: console.groq.com → Settings → Limits |
| AI answers fail with `503` | Temporary overload at the provider. The bot retries, then uses the fallback provider if configured |
| AI answers stop, with `404 model_not_found / decommissioned` | The provider retired the model. List the models (step 2.4), update the name in `config/llm.yaml`, and push |
| No morning message | Dashboard → Worker → *Trigger events* shows the cron? `config/schedule.yaml` time zone correct? Look for `scheduled` entries in the logs |
| Worker URL shows `error code: 1042` right after the first deploy | The new workers.dev subdomain is still activating. Wait 1–5 minutes and reload |
| `wrangler login` browser doesn't open | Copy the URL it prints into your browser manually |
| GitHub deploy or backup fails with `Authentication error` / `code: 10000` | The Cloudflare API token is missing **D1 → Edit** (step 5.2). Create a new token and set `CLOUDFLARE_API_TOKEN` again |
| Backup job fails | The fine-grained token expired or isn't limited to the data repo. Create a new one (step 5.3) and run `gh secret set DATA_REPO_TOKEN` again |

## Where every secret lives
| Secret | Password manager | Cloudflare (`wrangler secret`) | GitHub Secrets | `.dev.vars` (local only) |
|---|---|---|---|---|
| Telegram bot token | ✅ | ✅ | — | ✅ |
| Telegram user ID | ✅ | ✅ | — | ✅ |
| Webhook secret | — (random; set it again if lost) | ✅ | — | ✅ |
| Groq API key | ✅ | ✅ | — | ✅ |
| Gemini API key (optional) | ✅ | ✅ | — | ✅ |
| Cloudflare API token | ✅ | — | ✅ | — |
| Data repo token | ✅ | — | ✅ | — |
| Claude Code OAuth token (weeks 7–8) | ✅ | — | ✅ | — |

**Yearly:** renew the data repo token (step 5.3) and, if it expires, `claude setup-token` (step 5.4).
