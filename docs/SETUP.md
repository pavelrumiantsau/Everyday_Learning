# Setup Guide — step by step

This guide takes you from zero to a working bot. It assumes you've **never used Cloudflare or Gemini**.
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
Python (`python3 --version`) is already on macOS. It's needed later for audio (week 4).

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

## Step 2 — Gemini API key (10 min) 👤

Gemini is Google's AI model. The **free tier** needs no credit card.

1. Go to **https://aistudio.google.com** and sign in with a Google account.
2. Accept the terms. Click **Get API key** → **Create API key**. If asked, let it create a new Google Cloud project.
3. Copy the key (starts with `AIza…`) into your password manager as *Gemini API key*.
4. **Don't enable billing.** Without billing you stay on the free tier and can never be charged.
   The trade-off: Google may use free-tier requests to improve its models, so the bot never sends anything personal.
5. Test it 🤖 (paste your key when asked, and don't save it in a file):
   ```bash
   read -s GEMINI_API_KEY && export GEMINI_API_KEY
   curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
     -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Исправь ошибку и объясни по-русски: Aš eina į parduotuvę."}]}]}' \
     | head -c 800
   ```
   You should see a JSON answer that corrects *eina → einu*.
6. Your current limits are in AI Studio under **Rate limits / Usage** (Google changes them without notice).
   The bot uses about 20–60 requests/day, far below them.
7. If the model name stops working, get the current list with
   `curl -s -H "x-goog-api-key: $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/models | grep '"name"'`
   and update [config/llm.yaml](../config/llm.yaml).

**Optional backup provider (5 min):** **https://console.groq.com** → sign in → **API Keys** → Create. It's free and needs no card.
Save it as *Groq API key*. The bot switches to it automatically if Gemini is down or over its limit.

✅ **Done when** the `curl` test returns a Lithuanian correction.

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
   `GEMINI_API_KEY` and optionally `GROQ_API_KEY` (step 2), and `WORKER_URL` (step 4.4). Save.
   `.dev.vars` is git-ignored, so it never reaches GitHub. Then upload the secrets to Cloudflare, where they're stored encrypted:
   ```bash
   pnpm secrets:push
   ```
6. **Connect Telegram to the Worker** (tells Telegram to deliver your messages to it instantly):
   ```bash
   pnpm setup:telegram
   ```
   It sets the webhook (with the secret) and the command menu (`/today`, `/lesson`, `/help`), then prints the webhook
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

## Step 5 — GitHub: private backup repo, deploy from GitHub (20 min) 👤 + 🤖

From here on, every push to `main` runs tests and deploys automatically, and your data is backed up every night.

1. 🤖 Create the private data repo:
   ```bash
   gh repo create pavelrumiantsau/Everyday_Learning-data --private --description "Backups & reviews (private)"
   ```
2. 👤 **Cloudflare API token** (lets GitHub Actions deploy): Cloudflare dashboard → profile icon (top right) → **My Profile →
   API Tokens → Create Token** → template **"Edit Cloudflare Workers"** → **Use template**. Under *Permissions* check
   that **Account → D1 → Edit** is there, and add it if missing. *Account Resources*: your account. **Create** → copy the token.
3. 👤 **GitHub token for backups**: github.com → profile → **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**. Name: `everyday-learning-backup`. Expiration: 1 year (add a calendar reminder).
   *Repository access*: **Only select repositories → `Everyday_Learning-data`**. *Permissions → Repository → Contents: Read and write*. Generate → copy.
4. 🤖 **Claude subscription token** (lets GitHub Actions run Claude Code on your plan for content batches and the weekly review):
   ```bash
   claude setup-token        # 👤 approve in the browser; copy the printed token (shown only once)
   ```
5. 🤖 Store all of them as GitHub Secrets of the **public** repo (each command asks you to paste the value):
   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   gh secret set DATA_REPO_TOKEN
   gh secret set CLAUDE_CODE_OAUTH_TOKEN
   gh secret list            # names only, values are never shown
   ```
6. 🤖 Push to `main` → **Actions** tab: `ci` and `deploy` go green. Run `backup` once by hand
   (`gh workflow run backup.yml`) → a file `d1/YYYY-MM-DD.sql` appears in the data repo.

✅ **Done when** a push deploys by itself and the first backup shows up in `Everyday_Learning-data`.

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

---

## Troubleshooting
| Symptom | Check / fix |
|---|---|
| Bot doesn't reply | `pnpm setup:telegram --info` → look at `last_error_message`. `403` → the webhook secret doesn't match: check `.dev.vars`, then `pnpm secrets:push` and `pnpm setup:telegram` again. Then run `pnpm wrangler tail` and send a message |
| Bot replies to nobody | Wrong `TELEGRAM_USER_ID`. Check @userinfobot again, fix `.dev.vars`, `pnpm secrets:push` |
| Mini App says "unauthorized" | It was opened outside Telegram (e.g. in Safari), or the bot token changed. Open it via **▶ Learn** |
| AI answers stop, with `429` in the logs | Gemini rate limit. Groq takes over automatically if configured; otherwise wait a minute. Check AI Studio → Rate limits |
| AI answers stop, with `400/404 model not found` | Google renamed or retired the model. Update the model name in `config/llm.yaml` (step 2.7) and push |
| No morning message | Dashboard → Worker → *Trigger events* shows the cron? `config/schedule.yaml` time zone correct? Look for `scheduled` entries in the logs |
| `wrangler login` browser doesn't open | Copy the URL it prints into your browser manually |
| GitHub deploy fails with `Authentication error` | The Cloudflare API token is missing the D1 permission, or the account ID is wrong (step 5.2) |
| Backup job fails | The fine-grained token expired or isn't limited to the data repo. Create a new one (step 5.3) and `gh secret set DATA_REPO_TOKEN` |

## Where every secret lives
| Secret | Password manager | Cloudflare (`wrangler secret`) | GitHub Secrets | `.dev.vars` (local only) |
|---|---|---|---|---|
| Telegram bot token | ✅ | ✅ | — | ✅ |
| Telegram user ID | ✅ | ✅ | — | ✅ |
| Webhook secret | — (random; set it again if lost) | ✅ | — | ✅ |
| Gemini API key | ✅ | ✅ | — | ✅ |
| Groq API key (optional) | ✅ | ✅ | — | ✅ |
| Cloudflare API token | ✅ | — | ✅ | — |
| Cloudflare account ID | ✅ | — | ✅ | — |
| Data repo token | ✅ | — | ✅ | — |
| Claude Code OAuth token | ✅ | — | ✅ | — |

**Yearly:** renew the data repo token (step 5.3) and, if it expires, `claude setup-token` (step 5.4).
