# Everyday Learning — Analysis & Implementation Plan (v4)

> **Goal:** learn something new every day, in small doses.
> **Priority:** **Lithuanian to B2 as fast as possible** (currently A2–B1). **Spanish** (beginner) second;
> **French** (not started) third. All three should be usable in some way by the end of 2027.
> **Budget:** free tiers + your existing Claude subscription. The Claude API is an optional extra.
> **Devices:** iPhone (main), MacBook (work), Windows laptop (occasional). All of them run **Telegram**.

## Status (updated as work lands)

**App**
| # | Feature | Status | Branch / notes |
|---|---|---|---|
| 1 | Infrastructure: Cloudflare Worker + D1, auto-deploy on push, nightly backup, CI with unit + smoke tests | ✅ Done | |
| 2 | Bot: morning lesson + quiz polls, evening reminder, `/today`, `/lesson` | ✅ Done | |
| 3 | Mini App: Telegram login, flashcards (4 ratings), LT verb forms cards, LT noun genitives, placement test | ✅ Done | |
| 4 | Settings (new cards/day per language, poll cap), `/pause`, `/stats`, streaks + freezes | ✅ Done | Mini App ⚙️ + `/stats`, `/pause`, `/new`; defaults raised to LT 10 + ES 5 |
| 5 | Reverse cards (RU/EN → target, recall), part of settings per language | ✅ Done | added once the meaning card is known (2 correct answers) |
| 6 | Grammar lessons: rule of the day, exercises → cloze cards, weekday rotation | ⏳ In progress | `feat/grammar` (sub-agent) |
| 7 | Audio: TTS for words + examples, play button, voice clip in the bot | ⏳ In progress | `feat/audio` (sub-agent) |
| 8 | AI layer (Groq + Gemini fallback, budget, usage log) + `/tutor` LT chat + writing & voice feedback | ⏳ In progress | `feat/ai` (sub-agent) |
| 9 | Reading mode (graded texts, tap word → card) | ⬜ Next | |
| 10 | Weekly report, `/input` log, auto-adjust of new cards | ⬜ Next | |
| 11 | "Report a mistake" (bot + Mini App) | ⬜ Next | |
| 12 | Automation: Claude Code content batches (PR), weekly writing review, quarterly self-assessment | ⬜ Next | needs `CLAUDE_CODE_OAUTH_TOKEN` |

**Content**
| Area | Status |
|---|---|
| Lithuanian vocabulary | 175 words (B1–B2, Tatoeba examples, verb forms, noun genitives); year target ≈ 3,000 |
| Spanish vocabulary | 62 items (phrasebook + core words) |
| Grammar lessons | none yet (need feature 6) |
| French | starts April 2027 |

**Resuming after an interruption:** check this table, `git branch -a` for `feat/*` branches not yet merged into `main`,
and the latest CI run (`gh run list -L 3`). Every merged feature is deployed automatically.

---

### Change log
| Version | Change |
|---|---|
| v2 | Telegram as the main interface; switchable AI providers; LT explained in RU, ES/FR in EN; 12-month plan; progress data kept out of the public repo |
| v3 | Cloudflare Worker (free) runs the bot so replies are instant; GitHub still holds code, content, CI and backups. Lithuanian is the priority, B2 by autumn 2027; French moves to April 2027. Your Claude subscription is used where the terms allow. |
| **v4** | Decisions made: **Groq** for live replies (switched from Gemini after constant `503 high demand` errors on new keys), **light French from April 2027**, **no official exams** (self-assessment instead, §3.4), **Cloudflare**. New **step-by-step [SETUP.md](SETUP.md)** for Telegram, Gemini, Cloudflare and GitHub, linked from each roadmap step (§9). |

---

## 1. TL;DR

```
Telegram (iPhone / Mac / Windows)
 ├─ Bot chat: morning lesson + quizzes, Lithuanian tutor chat, homework, reminders, weekly report
 └─ Mini App (opens inside Telegram): flashcards, grammar lessons, stats
            │ instant, on-time
Cloudflare Worker (free) ── one deploy: Mini App files + API + Telegram webhook + cron reminders
            │                                          └── D1 database (your progress)
GitHub (public repo) ── code, lesson content, CI, deploy, audio generation,
                        Claude Code content jobs (subscription), nightly backup → private repo
Claude subscription ── Claude Code: writes the lessons · Claude app: Lithuanian voice/text conversations
```

- **Year-end targets:**
  - **Lithuanian B2 by about Sep–Dec 2027**, checked with quarterly self-assessments (§3.4).
  - **Spanish A2.**
  - **French A1+** (survival level).
- **Daily time:** a 20-minute core session, of which ~12 minutes is Lithuanian. Plus **~40 minutes of passive input**
  (mostly Lithuanian radio, podcasts and series) and 5 minutes of Lithuanian tutor chat.
  The **minimum day** is 5 minutes.

---

## 2. Starting point (short)

- **Lithuanian** has 7 cases, a vocative (like Ukrainian *кличний*), prefix aspect (*daryti → padaryti* ≈ *делать → сделать*)
  and mobile stress. Explaining it through **Russian** (with Ukrainian notes) saves a lot of time. B2 grammar that is new
  for you: the full participle system, *pusdalyvis/padalyvis/būdinys*, and reported speech (*netiesioginė nuosaka*).
  The app spends most of its grammar time on these.
- **Spanish/French** are explained in **English** (cognates). They get contrast notes once both are active.
- **Why Lithuanian first:** you are already at A2–B1, so each hour moves you further toward real fluency there.
  Keeping Spanish light and starting French later also avoids mixing the two Romance languages up while both are new.

---

## 3. The learning plan (Oct 2026 → Sep 2027, buffer to Dec 2027)

### 3.1 Daily time
| Block | Time | Where | Language split |
|---|---|---|---|
| Morning warm-up | 2 min | Quiz polls in the bot chat, answerable from the notification | mostly LT |
| Core session | 15–18 min | Mini App: reviews → new cards → rule of the day | **~12 min LT**, ~5 min ES (FR from Apr) |
| **Tutor chat** | 5 min | Bot `/tutor`: short written conversation in Lithuanian, corrections in Russian | LT |
| Passive input | 40 min | Commute, chores, gaming breaks. Log it with `/input` | **~30 min LT**, ~10 min ES |
| Twice a week | 10–15 min | **Voice conversation** with a Lithuanian tutor you set up as a Project in the Claude app (§5.2) | LT |
| Weekly | 20 min | Writing homework (LT) + weekly report | LT |

**Minimum day** = 15 answers (changeable in ⚙️). It keeps the streak. You earn a streak freeze for every 7 full days (max 2).

### 3.2 Hours and targets (approximate)
| Language | Year-1 total | Target |
|---|---|---|
| **Lithuanian** | ~80 h cards/lessons + ~180 h input + ~40 h speaking/writing ≈ **300 h** | **B2 by Sep–Dec 2027**. Realistic for a Slavic speaker starting at A2–B1, *if the input time happens* |
| Spanish | ~30 h active + ~60 h input ≈ 90 h | **A2** by Dec 2027 (travel, small talk, simple texts) |
| French | ~15 h active + ~25 h input from April ≈ 40 h | **A1+** by Dec 2027 (survival phrases, very simple conversations) |

In short, Lithuanian now gets about 70% of the time, bought with a lower French target. If you'd rather reach French
A2 as well, the only honest options are more daily time or starting French in 2028 (§12).

### 3.3 New cards per day (review load ≈ 10–12 min)
| Period | LT | ES | FR | Total |
|---|---|---|---|---|
| Q1 Oct–Dec 2026 | **10** (after placement) | 5 | 0 (sounds, weekly) | 15 |
| Q2 Jan–Mar 2027 | 10 | 5 | 0 (sounds, weekly) | 15 |
| Q3 Apr–Jun 2027 | 8 | 4 | 4 | 16 |
| Q4 Jul–Sep 2027 | 7 | 4 | 4 | 15 |
| Buffer Oct–Dec 2027 | 5 | 5 | 5 | 15 |

**≈ 3,000 new Lithuanian cards in year 1.** Together with the words you already know, that covers the vocabulary B2 expects.
Brakes: a daily review cap (150), no new cards on days with more than 150 reviews due, catch-up mode after a missed week, and `/pause`.

### 3.4 Lithuanian path to B2
| Quarter | Grammar & skills | You can… (milestone) |
|---|---|---|
| **Q1** Oct–Dec 2026 | **Placement** (swipe the top 3,000 words: known/unknown) + grammar diagnostic. Close the B1 gaps: all declensions sg/pl, frequentative past (*dirbdavau*), future, reflexive *-si-* with prefixes, conditional, definite adjectives (*gerasis*), prefix aspect. | …talk for 10 min about everyday life and work; write a 120-word email |
| **Q2** Jan–Mar 2027 | **Active participles** (*-ąs/-antis, -ęs/-usi, -siąs*), **pusdalyvis** (*-damas*), **padalyvis** (*-ant, -us*), *būdinys*, *kuris* clauses, verbal nouns (*-imas*), numerals (collective, ordinal + cases). | …follow LRT radio news on familiar topics; retell an article |
| **Q3** Apr–Jun 2027 | **Passive** (*-mas/-tas*, *yra padarytas*), **reported speech / netiesioginė nuosaka** (*jis esąs*), imperative/optative (*te-*), word formation, diminutives, formal vs informal register. | …hold a 20-min discussion and give your opinion; write a 250-word opinion text |
| **Q4** Jul–Sep 2027 | B2 consolidation: complex sentences, set phrases and idioms, listening to fast natural speech (podcasts, films), argumentation, B2-style mock tasks. | …talk spontaneously with native speakers; understand the main ideas of complex texts (B2 descriptors) |
| Oct–Dec 2027 | Final B2 self-assessment + maintenance; more time moves to Spanish/French | — |

**Checking your level (no official exams):** at the end of each quarter, a **self-assessment week**:
- the CEFR **can-do checklist** for the quarter's milestone, in the Mini App (tick what you can do confidently);
- a **mock task set** run by Claude Code from `prompts/assessment/`: a reading text + questions, a listening clip (LRT) + questions,
  a writing task scored against CEFR criteria, and a 10-min speaking session in the Claude app Project;
- the result goes into the weekly report and adjusts next quarter's focus (e.g. more listening if listening is lowest).

### 3.5 Spanish and French (kept light)
- **Spanish:** Q1–Q2: 300 everyday phrases + A1 (present tense, ser/estar, gustar, *ir a*). Q3–Q4: A1→A2 (preterite, reflexives,
  object pronouns, imperfect). Buffer: A2 consolidation.
- **French:** Q1–Q2: **sounds only**, one 10-minute lesson a week (nasal vowels, silent endings, liaison, spelling→sound).
  From April 2027: 300 phrases + A1 core (être/avoir, articles and gender, present, *aller* + infinitive), with ES-vs-FR contrast notes.

### 3.6 Weekly rhythm (one new grammar topic per day)
| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| LT rule | ES rule | LT rule | LT reading | ES rule (FR from Apr) | LT rule | LT writing + weekly report |
| | 🎙 LT voice (Claude app) | | | 🎙 LT voice (Claude app) | FR sounds (Q1–Q2) | |

### 3.7 Staying on track
- **Weekly report** (Sunday, in Telegram): minutes, new words, retention, input hours, tutor chats per language
  → **on track / behind / ahead** of the quarter's milestone.
- **Automatic adjustment:** if the last 7 days' average session was over 22 min, new cards drop 20%. If it was under 12 min
  and retention is ≥ 90%, they rise 10% (Lithuanian first).
- Monthly can-do check; quarterly self-assessment week (§3.4) for all active languages.

---

## 4. Architecture — Cloudflare Worker for the bot, GitHub for everything else

### 4.1 Why Cloudflare after all
With GitHub only, **nothing is always listening** for your Telegram messages. GitHub can only *check* for them on a
schedule (every 15 minutes at best, often later). So `/today` or a tutor-chat message would get a reply 15–30 minutes later.
For flashcards that doesn't matter. For the **Lithuanian tutor chat**, which is now a core daily activity, it would.
A **Cloudflare Worker** is a free, always-on endpoint. Telegram delivers each message to it immediately (a "webhook"),
so replies take seconds. Its cron jobs also run on time, while GitHub's can be late.

### 4.2 Components
| Part | Runs on | Job |
|---|---|---|
| **Worker** (Hono, TypeScript) | Cloudflare (free) | 1. Serves the **Mini App** files. 2. `/api/*` for the Mini App. 3. `/tg/webhook` for Telegram (instant replies). 4. **Cron every 15 min**: morning lesson, evening reminder, Sunday report |
| **D1** (SQLite) | Cloudflare (free) | Progress: review events, settings, tutor chats, homework, AI usage |
| **Mini App** (Vite + React + Telegram WebApp SDK) | Served by the Worker | Flashcards (FSRS runs on the device), lessons, stats; cached locally (IndexedDB) so it starts fast and handles bad connections |
| **Public GitHub repo** | GitHub | Code, lesson content, CI, deploy to Cloudflare, audio generation, Claude Code content jobs |
| **Private GitHub repo** `Everyday_Learning-data` | GitHub | **Nightly backup** of D1 (exported by an Action). Your data is never locked into Cloudflare. |

### 4.3 How a day flows
```
07:50 Worker cron → Telegram: "Labas rytas! 48 reviews · LT +10 · rule: pusdalyvis (~16 min) [▶ Learn]"
                    + 3 quiz polls (graded instantly by Telegram; answers reach the webhook as poll_answer)
Any time:  ▶ Learn → Mini App → session → events saved to D1 via /api/sync
           /tutor → chat in Lithuanian → instant reply + corrections in Russian → mistakes become cards
           voice message → speaking feedback within seconds
20:30 cron: only if the day isn't done → "2 minutes keeps your streak 🔥"
Sunday 18:00 cron: weekly report + LT writing homework
03:30 GitHub Action: export D1 → commit to the private data repo (backup)
```

### 4.4 Security (no passwords, no tokens in the browser)
- **Mini App → API:** Telegram signs the Mini App's launch data (`initData`) with the bot token. The Worker checks that signature and your
  **Telegram user ID**. You never enter anything, and it works the same on the iPhone, Mac and Windows.
- **Webhook:** Telegram's `secret_token` header is checked on every call; updates from any other chat are ignored.
- **Secrets:** bot token, AI keys → `wrangler secret`. Cloudflare API token, backup token, Claude Code token → GitHub Secrets. None are in the repo; CI runs `gitleaks`.

### 4.5 Free-tier fit (check current limits when building)
| Service | Free allowance (approx.) | Your use |
|---|---|---|
| Workers | 100k requests/day, 10 ms CPU per request | ~300 requests/day. FSRS runs on the phone; waiting for an AI reply doesn't count as CPU time |
| Cron Triggers | 5 per account | 1 (every 15 min; the code decides what's due) |
| D1 | Several GB, millions of row reads/day | a few MB |
| Workers static assets | Free | the Mini App |
| GitHub Actions | Unlimited minutes on public repos | CI, deploy, audio, content, backup |

AI replies: the Worker answers Telegram straight away and finishes the AI call in the background (`ctx.waitUntil`),
showing "typing…" meanwhile. *Check the current background-task time limit on the free plan. If long feedback hits it, a
Cloudflare Queue (free tier) can handle it.*

---

## 5. AI — switchable providers + your Claude subscription

### 5.1 Provider layer (unchanged design)
`packages/llm`, built on the Vercel AI SDK (adapters for Anthropic, Google, and any OpenAI-compatible API such as Groq, OpenRouter or Ollama).
The app asks for a **task**, and `config/llm.yaml` maps each task to a chain of provider:model pairs, with capability flags
(audio input, structured output), a monthly budget cap, fallback on errors, and a usage log. `pnpm llm:eval` compares
models on the same ~30 learner mistakes. This matters most for Lithuanian.

```yaml
# config/llm.yaml (v3 defaults: $0 at runtime). Google retires model names often, so the names live only here.
tasks:
  tutor_chat:        [groq:openai/gpt-oss-120b, google:gemini-3.8-flash]   # add anthropic:claude-haiku-4-5 if you enable the API
  answer_check:      [groq:openai/gpt-oss-20b,  groq:openai/gpt-oss-120b]
  writing_feedback:  [groq:openai/gpt-oss-120b, google:gemini-3.8-flash]   # weekly review by Claude Code, see §5.2
  speaking_feedback: [groq:<whisper model> → groq:openai/gpt-oss-120b]      # speech-to-text first, then feedback on the text
providers:
  anthropic: { key_env: ANTHROPIC_API_KEY, monthly_budget_usd: 5, enabled: false }
```
Switching to Claude later is **one line per task** plus an API key.

### 5.2 What your Claude subscription can and can't do here
Anthropic's rules (updated Feb 2026) allow subscription credentials **only in Claude Code and the Claude apps**.
Using them inside your own app or bot as an "API key" is **not allowed** and is blocked on Anthropic's side.
So the subscription covers everything *around* the app, but not the bot's live replies:

| Use | Allowed with the subscription? | How it fits the plan |
|---|---|---|
| **Writing lessons, vocab, exercises** in Claude Code on your Mac | ✅ | The main content pipeline (§6.3). Every 2 weeks a session drafts the next batch as a PR |
| **Scheduled content drafts in GitHub Actions** with `anthropics/claude-code-action` + `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) | ✅ (that's Claude Code running; it uses up your plan's usage) | A weekly Action proposes the next content batch as a PR for you to review |
| **Weekly review of your Lithuanian writing** by a Claude Code job reading the week's homework from the backup repo and posting a detailed report | ✅ (Claude Code) | A deeper Sunday review on top of the instant Gemini feedback |
| **Speaking and conversation in the Claude app** (iPhone/Mac), using a **Project "Lietuvių korepetitorius"** with instructions (your level, the current quarter's topics, correct me in Russian, keep a list of my typical mistakes) | ✅ | The twice-weekly 🎙 sessions in §3.6. The bot sends a link and the topic of the day. *Test how well voice mode handles Lithuanian; text chat certainly works.* |
| **Live bot replies** (`/tutor`, instant feedback) with the subscription token | ❌ not allowed | Uses **Groq free tier** by default (Gemini as optional fallback), or the **Claude API** if you add ~$1–3/month (§12) |

---

## 6. Content

### 6.1 Explanation languages
| Language | Cards | Explanations | Extra |
|---|---|---|---|
| Lithuanian | LT ↔ **RU** | **Russian** | Ukrainian/Belarusian notes where they are closer |
| Spanish | ES ↔ **EN** | **English** | Cognates, false friends |
| French | FR ↔ **EN** | **English** | ES-vs-FR contrast notes |

### 6.2 Sources (free licences)
Hermit Dave *FrequencyWords* (CC-BY-SA) decides word order. **Tatoeba** (CC-BY 2.0 FR) provides real sentences with translations. Wiktionary,
*lkz.lt* and *Dabartinės lietuvių kalbos žodynas* are used for checking. For **Lithuanian listening/reading**: LRT (lrt.lt).

### 6.3 Pipeline
```
pnpm content:sources                 # download frequency lists + Tatoeba exports into .cache/ (git-ignored)
pnpm content:candidates lt 1500 2500 # frequent words (by rank) + their shortest real Tatoeba sentence pairs
   → in a Claude Code session: pick useful words, write scripts/batches/<batch>.py
     (dictionary form, meaning, notes, and the Tatoeba id of the chosen example)
python3 scripts/batch-to-yaml.py <batch> <lang> <first-id> content/<lang>/…yaml
   → example text + translation are copied verbatim from Tatoeba by id, never retyped
pnpm content:validate → you skim the diff → commit → pnpm deploy:worker
```
First batch (Sep 2026): 159 LT words at B1–B2 (frequency ranks 1500–4000) and 52 ES core words, all with Tatoeba examples.
Known issue to fix: the frequency list comes from film subtitles, so it leans towards film vocabulary. The Mini App's placement test
(weeks 2–3) will tune the level.
LLM-written sentences are labelled `source: generated`. `/report` on any card logs a problem for the next batch.
Audio: `edge-tts` (`lt-LT-OnaNeural`/`LeonasNeural`, `es-ES-*`, `fr-FR-*`); fallback is the Google Cloud TTS free tier.

### 6.4 Item format (example)
The schema lives in [packages/core/src/schema.ts](../packages/core/src/schema.ts) and is checked by `pnpm content:validate`.
```yaml
- id: lt-w-0001            # <lang>-<w|p>-<number>; w = word, p = phrase
  type: word
  cefr: A2
  text: laikas
  stress: laĩkas           # optional; added after checking lkz.lt
  pos: noun
  gender: m
  meaning: { ru: время }   # LT → ru; ES/FR → en (enforced by the schema)
  note: { ru: "После отрицания — родительный падеж, как в русском: neturiu laiko" }
  examples:
    - { text: "Neturiu laiko.", translation: "У меня нет времени.", source: generated }   # or tatoeba:<id>
  tags: [freq-top-500]
```

---

## 7. Telegram bot
| Command / input | What it does |
|---|---|
| Menu **▶ Learn** | Opens the Mini App |
| `/today`, `/stats` | Plan and what's left; progress per language |
| **`/tutor [topic]`** | Lithuanian conversation (default topic = this week's grammar). Corrections in Russian at the end of each reply; mistakes become cloze cards. `/tutor es` for Spanish |
| Voice message | Speaking feedback (transcript + corrections) |
| Text in a target language | Writing feedback |
| `/input 30 lt radio` | Logs passive input |
| `/pause 3`, `/new lt 8`, `/report …` | Holiday mode, new cards/day, report a wrong card |

---

## 8. Repository layout
```
Everyday_Learning/                     (public)
├─ apps/
│  ├─ worker/            Hono: /api, /tg/webhook, scheduled(); D1 migrations; wrangler.toml
│  └─ miniapp/           Vite + React; Telegram WebApp SDK; Dexie cache; ts-fsrs
├─ packages/
│  ├─ core/              content schema (zod), FSRS replay, day planner, streaks, time zones
│  ├─ bot/               Telegram update handlers (commands, tutor, polls)
│  └─ llm/               provider router
├─ content/{lt,es,fr}/{phrasebook,vocab,grammar,reading,phonics}/
├─ prompts/{content,feedback,tutor}/
├─ config/{llm.yaml, schedule.yaml}
├─ scripts/              validate, crosscheck, build-content, llm-eval, tts
├─ docs/PLAN.md
└─ .github/workflows/    ci.yml, deploy.yml, audio.yml, content-batch.yml, backup.yml, weekly-review.yml

Everyday_Learning-data/                (private) — nightly D1 exports, weekly Claude Code writing reviews
```
Tests: Vitest for `core`, `bot` (recorded Telegram updates) and `llm` (fake providers); one Playwright smoke test for the Mini App.

---

## 9. Build roadmap — Lithuanian learning starts in week 1
Build time assumed: about 4–6 h/week.

Setup steps you do yourself are in **[SETUP.md](SETUP.md)**. Each one says what's 👤 you (browser/Telegram) and what's 🤖 Claude Code (terminal).
Only steps 1, 2, 3.1–3.2, 5.2–5.3 and 6 need you in a browser; Claude Code can run the rest with you.

| When | Setup (SETUP.md) | Build deliverable | Done when |
|---|---|---|---|
| **Week 1** (Oct 2026) | Steps **0–4**: Mac tools, Telegram bot, Groq key, Cloudflare account, D1 + secrets + first deploy | Worker + webhook + D1 + cron. First content: **LT 150 items (RU)**, ES 60 phrases. Morning lesson + quiz polls; `/today` | Every morning a Lithuanian lesson arrives, and `/today` answers instantly |
| **Weeks 2–3** | Step **5**: private backup repo, deploy from GitHub | Mini App v1: FSRS review, new cards, **LT placement (top 3,000 words) + grammar diagnostic**, `initData` auth | Full session on the iPhone and Mac, with progress in sync; a push to `main` deploys by itself |
| **Week 4** | Step **7**: open the Mini App from ▶ Learn | Grammar lesson player + cloze; audio; evening reminder; `/stats`, `/pause`; nightly backup | A normal day works end to end, with audio; a backup appears each night |
| **Weeks 5–6** | Step **6**: Claude app tutor Project | `packages/llm` (Groq + optional Gemini, Claude adapter ready but off); **`/tutor` for Lithuanian**; writing feedback; `llm:eval` | A daily 5-min tutor chat with instant corrections |
| **Weeks 7–8** | — | Voice-message feedback; LT reading mode; `/input`; weekly report + auto-adjust; `content-batch.yml`, `weekly-review.yml` (Claude Code) | The weekly report and the deeper Claude writing review arrive on Sunday |
| **Dec 2026** | — | First quarterly self-assessment set (`prompts/assessment/`) | Q1 self-assessment week runs at the end of December |
| **Mar 2027** | — | French launch pack (phrasebook + A1 core + contrast notes) | French live on 1 April 2027 |
| Ongoing | Yearly: renew tokens (SETUP.md, "Where every secret lives") | Content PR every 2 weeks; monthly check; quarterly self-assessment | — |

**Rule:** after week 1, **study first, code second.**

---

## 10. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Free-tier limits change or a provider is overloaded | Provider chain: Groq → Gemini/OpenRouter free models as fallbacks; Claude API is one config line away; model names only in `config/llm.yaml` |
| Anthropic changes the subscription rules | Only Claude Code and the Claude app use the subscription, both official uses; the app runs without it |
| Weak Lithuanian quality from some models | `llm:eval` picks the best model for LT; Tatoeba sentences first; `/report` |
| Cloudflare changes the free tier | Data backed up nightly to GitHub; the Worker code is standard Hono + SQLite and moves to another host in a day |
| Review pile-up | Review cap, new-card brake, catch-up mode, `/pause` |
| Too little Lithuanian input → B2 slips into 2028 | Input hours tracked; the weekly report flags when you're below ~3 h/week of LT input |
| Building takes over from learning | Week-1 bot MVP; roadmap capped at 8 weeks |

---

## 11. Input sources (log with `/input`)
| Language | Listening | Reading / watching |
|---|---|---|
| **Lithuanian** | LRT radio & podcasts (lrt.lt); LRT kids' programmes early on, moving to adult talk shows in Q3–Q4 | LRT news, LRT Mediateka series with Lithuanian subtitles, graded → authentic articles |
| Spanish | *Dreaming Spanish* (by level), *Coffee Break Spanish* | Graded readers |
| French (from Apr) | *Coffee Break French*, *InnerFrench* | RFI *Français facile* |

Optional from Q2: a free language-exchange app (Tandem / HelloTalk) for real Lithuanian conversations.

---

## 12. Decisions
**Made:** Groq for live bot replies, with Gemini as an optional fallback (the Claude API stays off and can be enabled later with one config line) · light French from April 2027 ·
no official exams (quarterly self-assessment instead) · Cloudflare Worker + D1 for the bot.

**Set during setup ([SETUP.md](SETUP.md)):** bot name (step 1) · time zone and reminder times (step 4.4, default 07:50 / 20:30).
