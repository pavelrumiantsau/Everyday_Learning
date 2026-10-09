# Everyday Learning for colleagues — extension plan (v2, 2026-10-08)

> **Goal:** any colleague can run **their own personal copy** of the app: their own Telegram bot, Cloudflare Worker, D1
> database and AI key, with setup in **about 8 manual actions** and no local tools. A first-run **setup wizard** asks what to learn
> (Lithuanian only is a normal choice) and how fast. Lithuanian gets a **complete course from zero to the A2 state language
> exam** (Basic–I category, "I valstybinės kalbos mokėjimo kategorija").
> **Hard constraints:** the owner's bot behaves exactly as today. Spanish and French content is not touched. Every copy serves
> exactly one person. Everything a copy contains can legally be shared.

Status: **plan approved in outline, nothing built yet.** Build state is tracked in §9 (work plan).

---

## 1. Requirements (owner, 2026-10-08)

| # | Requirement | Where in this plan |
|---|---|---|
| R1 | Every colleague runs their own instance: own bot, Worker, database, keys | §3 |
| R2 | Setup instructions are very easy, with the fewest possible manual actions | §3.2 |
| R3 | One bot = one learner. Two people can never mix their results | §3.1 |
| R4 | First step is a setup that picks language(s) and pace | §5 |
| R5 | Lithuanian A-level course from "knows nothing" to the end of A2, covering everything the A2 exam needs | §6 |
| R6 | Explanations in Russian. **No Ukrainian or Belarusian comparisons** in the new course (colleagues may not know those languages) | §6.8 |
| R7 | Audio may be generated, but everything shipped must be shareable (licences) | §7 |
| R8 | Spanish and French materials untouched; Lithuanian-only learning possible | §4, §5 |
| R9 | The owner's bot is not affected; the owner never gets A-level material | §4 |

---

## 2. Analysis (what exists today)

### 2.1 Single-learner assumptions in the code
| Assumption | Where | Change needed |
|---|---|---|
| Owner = `TELEGRAM_USER_ID` secret; webhook ignores other senders (`apps/worker/src/bot.ts:12`), API returns 403 (`apps/worker/src/api.ts:15`) | Worker | keep; add "claim on first start" for copies (§3.1) |
| No `user_id` in any of the 20 D1 tables | migrations | none: one database per learner |
| Weekly rhythm LT Mon/Wed/Sat, ES Tue/Fri, Thu LT reading, Sun writing | `GRAMMAR_ROTATION` (`packages/core/src/grammar.ts`), `READING_WEEKDAY` (`packages/core/src/reading.ts`) | build from the profile (§5.4) |
| French grammar waits for 2027-04-01 | `FR_START` | profile date; legacy keeps the constant |
| Pace LT 10 / ES 5 / FR 0, Vilnius time | `config/schedule.yaml` | from the profile |
| "B1, native Russian/Ukrainian/Belarusian" in AI prompts | `PROFILES` (`packages/llm/src/learner.ts`) | built from the profile (A1/A2 styles) |
| First reading level LT = B2 | `DEFAULT_READING_LEVEL` | from the profile |
| B1→B2 quarter milestones with dates | `config/milestones.yaml` | course milestones for copies |
| Weekly status tuned to LT input minutes | `packages/core/src/weekly.ts` | targets from the profile |
| Deploy identity: account id, D1 id, URL | `apps/worker/wrangler.toml` | derived in CI for copies (§3.4) |
| Backup into `pavelrumiantsau/Everyday_Learning-data` | `.github/workflows/backup.yml` | copies back up into their own repo |
| New words in file order | `pickNewItems` (`packages/core/src/planner.ts`) | course order for copies |
| No LICENSE in the repo | — | add (§7.4) |

### 2.2 Lithuanian below B1
| Area | A1 | A2 | Gap |
|---|---|---|---|
| Words | 617 | 391 | about 1,000 words exist, in batch order, not by topic. Stress marks missing on 120 A1 + 125 A2. Audio: **0** A1, 95 A2 |
| Grammar | 0 | 2 | no beginner course; the 119 other lessons are B1–B2 |
| Pronunciation | — | — | no sounds track |
| Phrasebook | — | — | none (ES and FR have one) |
| Reading | — | — | easiest text is B1 |
| Listening, writing, speaking tasks for the exam | — | — | none at A level |

Spanish (A1 642 words / A2 743, 59 A1–A2 lessons) and French (sounds track, 992 A1–A2 words, 35 lessons) already start from zero
and **stay as they are** (R8).

---

## 3. Personal copies

### 3.1 One bot = one learner (R3)
- Each copy has its **own** bot token, Worker, D1 database and Groq key. Nothing is shared between copies or with the owner.
- **Owner binding.** The Setup workflow (§3.2) generates a one-time **claim code**, stores it as a Worker secret and shows a link
  `https://t.me/<bot>?start=<code>` in the run summary of the colleague's **private** repo. The first `/start <code>` saves that
  Telegram user id in D1 (`settings.owner`) and deletes the code. From then on:
  - messages, poll answers and Mini App calls from anyone else get one reply: «Это личный бот. Свой можно сделать по
    инструкции: <link>», and nothing else happens (no cards, no AI calls, nothing written);
  - group and channel updates are ignored;
  - the owner can't be changed from Telegram. Re-binding needs a new Setup run (new code).
- The owner's deployment keeps `TELEGRAM_USER_ID` (the secret wins over `settings.owner`), so its check is unchanged.
- Smoke test: a second Telegram id sends `/start`, text, a poll answer and a Mini App request → only the one-line reply, no
  database writes.

### 3.2 Setup for a colleague: 8 manual actions, ~25 minutes, browser only (R2)
No terminal, no Node, no editing files. Guide: `docs/SETUP-COPY.md` (Russian, one screen per step, screenshots).

| # | Manual action | Where | Time |
|---|---|---|---|
| 1 | Create a bot: `/newbot`, a name, a username → copy the **token** | Telegram, @BotFather | 3 min |
| 2 | Create an **API key** (free, no card) → copy | console.groq.com | 3 min |
| 3 | Sign up (free, no card) → **Create API token** from the template «Edit Cloudflare Workers», add permission «D1: Edit» → copy | dash.cloudflare.com | 7 min |
| 4 | Open the project page → **Use this template** → *Private* → Create | GitHub | 2 min |
| 5 | Settings → Secrets → Actions: paste `TELEGRAM_BOT_TOKEN`, `CLOUDFLARE_API_TOKEN`, `GROQ_API_KEY` | GitHub, own repo | 4 min |
| 6 | Actions → **Setup** → Run workflow | GitHub | 1 click, ~4 min wait |
| 7 | Open the link at the end of the run → Telegram opens the bot → **Start** | GitHub → Telegram | 1 min |
| 8 | Answer the setup wizard in the Mini App (§5) | Telegram | 2 min |

The Groq key (2) is optional: without it the app works and only the AI parts (tutor, writing/speaking feedback, word lookup) say
they are switched off; the key can be added later and Setup re-run.

**What the Setup workflow does by itself:** checks the three secrets (clear Russian error messages); reads the Cloudflare
account id from the token; registers a `workers.dev` subdomain if the account has none; creates the D1 database; runs all
migrations; generates the webhook secret and claim code; builds and deploys the Worker and Mini App; pushes Worker secrets;
sets the Telegram webhook, command menu and ▶ button; reads the bot username; writes the claim link to the run summary.
Re-running it is safe (idempotent) and never wipes the database.

### 3.3 Updates, backups, cost
- **Updates:** a weekly **Update** workflow in each copy (also runnable by hand) copies the newest upstream `main` into the
  copy, runs the checks and deploys. Copies keep no local file changes (their settings live in D1), so updates never conflict.
  Workflow files stay thin (they call `scripts/ci/*`), so they rarely change. If they do, the bot tells the learner which one
  button to press. *Spike in phase B: GitHub doesn't let `GITHUB_TOKEN` push changed workflow files and its pushes don't
  trigger other workflows, so Update deploys itself and skips `.github/workflows/`.*
- **Backups:** nightly D1 export into a `backup` branch of the same private repo (no extra repo or token). D1 Time Travel is
  a second safety net.
- **Cost:** $0. Cloudflare Workers/D1 free plan; Groq free tier; GitHub private-repo Actions ~100–150 min/month of the 2,000
  free (checks ~4 min per update, backup ~1 min per night).
- **Owner, one-time:** tick «Template repository» in the GitHub settings of this repo. This doesn't affect the owner's bot.

### 3.4 The owner's deployment path stays the same
Copy steps run only when `github.repository` is not `pavelrumiantsau/Everyday_Learning`, so in the owner's repo they are
skipped and the deploy is **exactly as today**. In a copy, `scripts/ci/copy.ts configure` finds the account, registers a
workers.dev subdomain if needed, finds or creates the D1 database and writes their ids into `wrangler.toml` in the CI
workspace only (never committed). The owner-only workflows (`backup.yml` into `Everyday_Learning-data`,
`content-batch.yml`) run only in the owner's repo; copies use `setup.yml`, `update.yml` and `backup-copy.yml`, which do
nothing in the owner's repo.

---

## 4. The owner's bot is not affected (R8, R9)

1. **Legacy profile.** A database with cards but no `profile` (the owner's) runs on the built-in legacy profile = today's
   constants (rotation, `FR_START`, reading levels, AI profiles, schedule.yaml, file-order new words). The wizard opens only
   when there is no profile **and** no cards. The owner's database gets no new rows unless the owner runs `/setup`.
2. **Foundation content is invisible to the owner.** Every new A-level item (word, phrase, lesson, text, dialogue, task, mock
   exam) carries `track: foundation`. Only `lt.course: foundation` profiles see it. The filter sits in one place per picker
   (`pickNewItems`, `pickLesson`, `pickText`, lists, placement), and a test asserts that the legacy profile never gets a
   foundation id.
3. **Frozen reference copies of today's logic** (`packages/core/test/legacy/`, added before any refactor) plus golden tests:
   the profile-driven code with the legacy profile must give identical results to the frozen copies for: the rule-of-the-day
   language for every day 2026-10-01 → 2028-12-31, `pickLesson` sequences, `pickNewItems` over the full built content,
   `nextReadingLevel`, weekly status/adjustment, AI `PROFILES`.
4. **Spanish and French untouched:** a CI check fails if a commit on the extension work changes anything under `content/es`,
   `content/fr` or the ES/FR prompts (`scripts/ci/untouched.sh`, compares with the merge base).
5. **Shared Lithuanian A1–A2 words** (the ~1,000 that already exist and are already in the owner's queue) are reused by the
   course. Allowed changes to them: stress marks, audio, fixing a wrong form. Nothing new is added to the owner's queue. Their
   ids, order and meanings stay.
6. **No changes to existing D1 tables.** Profile and owner binding live in `settings`. New tables (e.g. writing/speaking task
   results, mock exam results) are only added, never altered; the owner's database gets them empty.
7. **Staging copy first.** Everything is tried on a staging copy (made with the same Setup workflow, its own test bot) before
   it reaches `main`. `pnpm smoke` keeps running the owner's scenario unchanged; new smoke files run a fresh copy.

---

## 5. First-run setup wizard (R4)

### 5.1 Flow (Mini App, opened right after the claim `/start`)
1. **What do you want to learn?** 🇱🇹 Lithuanian · 🇪🇸 Spanish · 🇫🇷 French (multi-select; **Lithuanian only** is the
   pre-selected default). With more than one: which is the **main** language (gets ~70% of new material).
2. **Your level, per language:**
   - Lithuanian: «С нуля» · «Знаю основы» (→ short placement: one quick check per course unit, known units are skipped) ·
     «B1 и выше» (→ the existing B1–B2 course, `course: continuing`, with the word placement test).
   - Spanish / French: «С нуля» · «Знаю основы» (existing placement test). Their content is used as it is.
3. **Goal** (Lithuanian): «Сдать экзамен A2» (with a date, optional) · «Просто учиться».
4. **Pace:** Light / Normal / Intensive (§5.2). With an exam date, the wizard shows the needed pace and warns if even Intensive
   is too slow.
5. **Daily rhythm:** time zone (pre-filled from the device), morning and evening time, minimum day.
6. **Summary** → «Начать». Saves the profile, builds the week (§5.4) and sends the first lesson immediately: the first sounds
   lesson + the first five words of unit 1.

`/setup` re-runs it later without losing progress; ⚙️ shows and edits the same profile.

### 5.2 Pace (Lithuanian from zero to the A2 exam)
| Pace | Time/day | New words/day | New lessons/week | Course (≈1,500 words, ~50 lessons) | Ready for the A2 exam |
|---|---|---|---|---|---|
| Light | ~15 min | 5 | 2 | ~10 months | ~12 months |
| Normal | ~25 min | 8 | 3 | ~6.5 months | ~8 months |
| Intensive | ~45 min | 15 | 4–5 | ~3.5 months | ~5 months |

"Ready" includes about 6 weeks of exam practice (mock exams, listening, speaking situations). These are estimates for a
Russian speaker who also listens to Lithuanian (radio, podcasts, series) a few times a week. The wizard says so and shows
the 🎧 sources. With two or more languages, the other languages get 3–5 words/day.

### 5.3 Profile (zod schema `Profile` in `packages/core`, stored in D1 `settings.profile`)
```yaml
timezone: Europe/Vilnius
morning: "07:50"
evening: "20:30"
min_day_answers: 15
main: lt
pace: normal                  # light | normal | intensive | custom
languages:
  lt: { course: foundation, level: A0, goal: { exam: A2, date: 2027-06-15 }, start: 2026-11-02 }
  # es: { course: standard, level: A1, start: 2026-11-02 }   # only when chosen
created: 2026-11-02
```
`course`: `foundation` (A-level course) · `continuing` (today's B1+ path) · `standard` (ES/FR: content as it is). The legacy
profile is the same shape, generated from today's constants and never stored unless the owner runs `/setup`.

### 5.4 What the profile drives
| Today (constant) | From the profile |
|---|---|
| `GRAMMAR_ROTATION`, `FR_START`, Saturday sounds | `weekPlan(profile)`. Lithuanian only, Normal: Mon/Wed/Fri lesson, Tue listening, Thu reading, Sat writing or speaking task, Sun weekly report. Legacy → today's table |
| `READING_WEEKDAY`, `DEFAULT_READING_LEVEL` | the week plan; foundation texts follow the course unit |
| `schedule.yaml` numbers | pace (§5.2); D1 `prefs` still override, so the owner's saved settings keep winning |
| `pickNewItems` file order | `course: foundation` → course-map order (unit by unit); otherwise file order |
| AI `PROFILES` | level (A0/A1/A2/B1…), "native Russian, fluent English" (no Ukrainian/Belarusian), A1/A2 styles: 1–2 short present-tense sentences, Russian translation in brackets, corrections in Russian |
| `milestones.yaml` quarters | foundation: per-unit can-do lists and the exam milestones |
| weekly status | course progress vs the pace / exam date |
| "lt" defaults in `/rule`, `/more`, `/tutor` | the main language |
| Spanish/French screens | hidden when the language isn't in the profile |

---

## 6. Lithuanian course: from zero to the A2 exam (R5, R6)

### 6.1 Target: the Basic–I category state language exam (A1–A2)
Facts from the National Agency for Education (NŠA), checked 2026-10-08:
- **Levels:** Basic category = A1, **I category = A2**, II = B1, III = B2. One exam gives A1 or A2.
- **Parts:** (1) **reading and writing** — a computer test, tasks 1–4 are A1 (22 points), tasks 5–9 are A2 (28 points);
  (2) **listening** — tasks 1–2 A1 (10 points), tasks 3–4 A2 (10 points); (3) **speaking** — a conversation with an examiner,
  3 speaking situations (0–3 points each) + 0–1 from the interviewing examiner (max 10).
- **Pass rules:** A1 in a part = ≥ 60% of that part's A1 points (reading/writing ≥ 13 of 22, listening ≥ 6 of 10); A2 =
  ≥ 60% of the A2 points (≥ 17 of 28, ≥ 6 of 10) **and** A1 reached in the same part. Speaking: ≥ 5 points with ≥ 2 in two
  situations = A1; ≥ 6 points with two situations together worth ≥ 5 (e.g. 3 + 2) = A2 (NŠA's
  examples: 2 + 2 + 1 + 1 = A1 only; 3 + 2 + 0 + 1 = A2). **A2 overall only if all three parts are
  A2.**
- **Practicalities:** €52 (2026), registration 30 to 7 days before at eksternams.nsa.smm.lt, ~15 sessions a year, at a base
  school in the municipality. Since 2026-01-01 staff who serve customers need at least A1, A2 later. The citizenship
  Constitution exam is separate and **out of scope**.

### 6.2 Official A2 content (Lithuanian A2 content description, Ministry of Education)
- **12 topics:** 1 identity · 2 home · 3 nature and region · 4 daily life · 5 leisure · 6 travel · 7 relations with people ·
  8 health and hygiene · 9 education · 10 shopping · 11 food and drink · 12 services. Each has a word list (not exhaustive).
- **Speaking:** about yourself and your family (name, address, phone, date and place of birth, age, nationality, family,
  where you are from), likes and dislikes, home, surroundings, activities, hobbies and events, travel and transport,
  relationships, states and well-being, hygiene, studying and languages, shopping, food (ordering in a café, buying in a
  canteen); **asking** the same things; **asking to repeat or explain**.
- **Reading:** dictionary definitions, event ads, tickets and programmes, menus, recipes, short personal notes and text
  messages, short adapted articles (biographies, event reports and descriptions).
- **Writing:** short personal notes, greetings and congratulations, short notices (lost / found).
- **Grammar:** all **5 noun declensions** in all cases, singular and plural; **adjectives** (3 types) in all cases + degrees;
  **adverbs** (time, place, manner) + degrees; **pronouns** personal + *kas, tas, kitas, koks, kuris, pats* in cases;
  **numerals** cardinal (with nouns, *vienuolika…* + genitive, tens unchanged), ordinal (agreement, years and dates),
  collective (*vieneri, dveji*); **prepositions** with genitive, accusative, instrumental (place and time); **conjunctions**
  *ir, o, bet, kad, kai, jeigu/jei, nors*; particles, interjections; **verbs**: transitivity (accusative; genitive after
  negation; *bijoti, reikėti* + genitive), **present** (3 types), **past** (2 types), **past frequentative** (*-davo*),
  **future**, **imperative**, **conditional** (politeness, *kad* + conditional, purpose); participles **only as words**
  (*vedęs, ištekėjusi, miegamasis*).

A1 content is the subset needed for the A1 tasks (personal information, very short texts, numbers, time, prices, simple
questions). The course follows the A2 inventory in full; it is checked line by line against the A1 and A2 content
descriptions (both downloaded into `.cache/exam/` with `scripts/exam-sources.sh`, not committed).

### 6.3 Course structure
```
Stage 0  Sounds (6 micro-lessons)                          ~2 weeks, alongside unit 1
Stage A1 12 units, one per official topic, basic           → A1 mock exam
Stage A2 12 units, same topics, deeper                     → 2 full A1+A2 mock exams
Exam     strategy lesson, timed practice, speaking drills   ~6 weeks
After    → the existing B1–B2 course (profile switches to `continuing`)
```
**Every unit** has: 40–70 words · 6–8 phrases · 1–2 grammar lessons · 2 reading texts in exam text types · 3 short listening
dialogues with questions · 1 writing task · 2 speaking situations · a can-do list. A unit ends with a 10-question check; ≥ 80%
unlocks the next unit (the learner can always go ahead).

### 6.4 Units
**Stage 0 — sounds:** (S1) alphabet, spelling your name aloud (*pasakyti paraidžiui*); (S2) long and short vowels *a/ą, e/ę/ė,
i/į/y, u/ų/ū*; (S3) *ie, uo* and diphthongs *ai, ei, au, ui*; (S4) *č, š, ž, c, dz, dž, ch*; (S5) soft consonants (*i* after
a consonant: *lietus, geriau*); (S6) stress: it moves, how the app marks it, typing *ą č ę ė į š ų ū ž* on phone and computer
(the exam is typed).

**Stage A1**
| U | Topic (official #) | Situations | Grammar |
|---|---|---|---|
| 1 | Знакомство (1) | name, country, nationality, job, numbers 0–10, phone number | *būti* present; personal pronouns; nominative, gender *-as/-is/-ys, -a/-ė*; *kas? koks? iš kur?* |
| 2 | Еда и кафе (11) | ordering, *norėčiau*, paying | present type I (*dirba*); accusative sg.; *noriu* + infinitive |
| 3 | Мой день (4) | days, time, routine | present types II–III (*myli, žino*); *kelinta valanda?*; time in the accusative (*pirmadienį*) |
| 4 | Дом (2) | rooms, furniture, address | locative sg. (*virtuvėje*); *yra / nėra* + genitive; numbers 11–100 |
| 5 | Магазин (10) | prices, quantities, colours | genitive sg.; *kiek kainuoja*; *euras / eurai / eurų*; adjective agreement (nominative) |
| 6 | Город и транспорт (6) | directions, tickets | *į* + accusative, *iš* + genitive; instrumental of means (*autobusu*); *eiti / važiuoti* |
| 7 | Семья (1, 7) | family, appearance, character | *turėti* + accusative; nominative plural; *mano, tavo, jo, jos* |
| 8 | Свободное время (5) | hobbies, likes | *patinka* + dative pronouns; *mėgti*; reflexive verbs in the present (*keliuosi*) |
| 9 | Погода и природа (3) | seasons, months, weather | *lyja, sninga, šalta*; seasons and months; ordinal numbers, dates |
| 10 | Здоровье (8) | body, *skauda*, pharmacy | dative + *skauda* + accusative; imperative as fixed phrases (*gerkite*) |
| 11 | Услуги (12) | post, bank, phone call, formal *jūs* | vocative of names (*Jonai, Rasa*); polite phrases *Gal galėtumėte…?* |
| 12 | Учёба и языки (9) | languages, courses, past studies | past tense intro (*buvau, mokiausi, dirbau*); *kalbėti lietuviškai* |

**Stage A2**
| U | Topic (official #) | Situations / exam text types | Grammar |
|---|---|---|---|
| 13 | Биография (1) | short biography, forms | past tense both types and stems; years and dates (*gimiau 1990 m.*); *vedęs, ištekėjusi* as words |
| 14 | Квартира и быт (2) | renting, repairs, notes to neighbours | plural of 1st–2nd declension in all cases; imperative; *ant, po, prie, šalia, už* |
| 15 | Регион и природа (3) | trips in Lithuania, weather forecast | future tense; comparison (*šiltesnis, šilčiausias, šilčiau*) |
| 16 | Будни (4) | habits, "when I was a child" | past frequentative *-davo*; reflexive verbs in all tenses; *kai* |
| 17 | Досуг и праздники (5) | invitations, event ads, programmes | dative uses (*dovanoti kam*); conditional for wishes (*norėčiau, galėtume*) |
| 18 | Поездки (6) | tickets, timetables, hotel | instrumental (*su draugu, traukiniu*); declensions 3–5 (*-is, -us, -uo / -ė*) |
| 19 | Люди и отношения (7) | greetings and congratulations (writing) | personal pronouns in all cases; *linkėti* + genitive |
| 20 | Здоровье и гигиена (8) | doctor, advice | *reikia, turiu, galima, negalima* + infinitive; *kad* + conditional (*patariu, kad…*); *man šalta* |
| 21 | Учёба и наука (9) | courses, notices | conjunctions *kad, nes, jeigu, nors, bet, o*; ordinal numerals in cases (*pirmame kurse*) |
| 22 | Покупки (10) | sizes, returns, complaints | numerals with nouns in all cases; collective numerals (*vieneri, dveji*); adjectives in all cases |
| 23 | Еда и напитки (11) | menus, recipes | genitive of quantity and partitive; instructions (imperative / infinitive); adjectives in plural cases |
| 24 | Услуги (12) | lost / found notice (writing), phone calls | *kas, koks, kuris, tas, pats* in cases; *kuris* clauses; genitive after negation and *bijoti, reikėti* |

**Exam stage:** (E1) the exam format, timing and strategy; (E2–E4) three mock exams (one A1, two full A1+A2), scored with the
NŠA rules; daily speaking situations and listening until the exam date.

### 6.5 Skills: what the app adds
| Skill | Exam part | In the app | New feature |
|---|---|---|---|
| Words, phrases | all | flashcards, «Учить новые слова», quiz polls (exist) | course-map order; phrase cards for LT |
| Grammar | reading/writing | rule of the day + cloze cards (exist) | foundation lessons; **diacritics strict mode** for exam practice (*ą/a* is wrong, as in the exam) |
| Reading | part 1 | 📖 reading (exists) | exam text types (ads, menus, tickets, notes, SMS, recipes, bios); new task formats: match, true/false, gap-fill |
| Writing | part 1 | writing feedback (exists, AI) | **writing tasks** with a format and word count (congratulation, note, notice), AI feedback in Russian with an A2 checklist |
| Listening | part 2 | — | **listening**: short dialogues and announcements with audio (§7), 2–4 questions, replay limited as in the exam |
| Speaking | part 3 | voice messages → Whisper → feedback (exists) | **speaking situations**: a card with the situation (e.g. "ask the examiner 5 questions about their working day"), learner answers by voice, AI checks task completion against the 0–3 scale |
| Exam | all | — | **mock exam mode**: timed parts, NŠA scoring, result A1/A2/not passed per part |

### 6.6 Vocabulary
- **Target ≈ 1,500 words** (A1 ≈ 700, A2 +800), the A2 inventory's 12 word lists covered in full.
- Step 1: map the existing ~1,000 A1–A2 words to units (no new ids, nothing changes for the owner).
- Step 2: coverage check of every unit against the official word lists and a topic checklist → **gap words** (expected
  ~400–600) as new items `lt-*-6001+` with `track: foundation`.
- Rules as today: Tatoeba examples only (empty id is fine), `forms` for verbs, `gen` for nouns, stress marks for **every**
  course word (A-level words without stress are a priority: ~245 + all gap words).

### 6.7 Content formats (new)
| Content | Folder / id | Schema notes |
|---|---|---|
| Course map | `content/lt/course/foundation.yaml` | units → word ids, phrase ids, lesson ids, text ids, dialogue ids, task ids, can-do; validation: every id exists, no word in two units, every course word has stress |
| Phrases | `content/lt/phrasebook/`, `lt-p-6001+` | Tatoeba sentences verbatim, Russian translation |
| Lessons | `content/lt/grammar/`, `lt-g-0201+`, `track: foundation` | own `order` sequence; existing limits (≤ 5 examples, ≤ 8 exercises) |
| Reading | `content/lt/reading/`, `lt-r-0201+`, `track: foundation` | A1 40–120 words, A2 80–180 words; `kind: ad / menu / note / sms / recipe / bio / article`; 3–5 questions |
| Listening | `content/lt/listening/`, `lt-l-0001+` | dialogue lines with speaker; 2–4 questions; audio per line |
| Writing tasks | `content/lt/tasks/`, `lt-t-0001+` | situation, format, word range, checklist |
| Speaking situations | `content/lt/tasks/`, `lt-s-0001+` | situation, what counts as done, example answer |
| Mock exams | `content/lt/exams/`, `lt-x-0001+` | parts, tasks, points mapped to NŠA scoring |

All written content (texts, dialogues, tasks, mock exams) is `source: generated` and **original**: modelled on the exam
format, never copied from NŠA or textbook material.

### 6.8 Explanations: Russian only (R6)
- New recipe `prompts/content/lt-foundation.md`: explanations and comparisons in **Russian only**, for a learner with **no**
  Ukrainian or Belarusian; short sentences; one point at a time; every Lithuanian form with stress marks; first time a
  grammar term appears, give the Russian term and the Lithuanian one (*vardininkas — именительный*).
- AI prompts for copies: "native Russian, fluent English" only.
- The B1+ course (for colleagues who continue) has Ukrainian/Belarusian remarks in 8 files. They are side notes next to a
  Russian explanation; check that each still reads fine without them. Content changes there are wording only (allowed, §4.5).

### 6.9 Volume (content sessions of ~12 lessons/texts or ~80–100 words)
| Area | Items | Sessions |
|---|---|---|
| Course map + mapping 1,000 existing words | 24 units | 1–2 |
| Sounds lessons | 6 | 1 |
| Grammar lessons | ~44 (A1 ~20, A2 ~22, exam 2) | 4 |
| Phrases | ~170 | 2 |
| Gap words | ~400–600 | 5–6 |
| Stress marks | ~245 existing + gap words | 2–3 |
| Reading texts | 48 | 3 |
| Listening dialogues | 72 | 4 |
| Writing tasks + speaking situations | 24 + 48 | 2 |
| Mock exams | 3 | 2 |
| **Total** | | **~27–30** |

The owner (or a Lithuanian-speaking reviewer) reads every lesson, text and dialogue before merge, as today.

---

## 7. Audio and sharing (R7)

### 7.1 Licence audit
| Source | Used for | Licence | OK to share? |
|---|---|---|---|
| Tatoeba | example sentences | CC BY 2.0 FR (some CC0) | ✅ with attribution (already in file headers) |
| English Wiktionary | stress marks (`content/lt/stress.yaml`) | CC BY-SA 4.0 | ✅ attribution + same licence for that file |
| FrequencyWords | choosing words (lists not shipped) | CC BY-SA 4.0 | ✅ (nothing shipped) |
| Own text (meanings, lessons, texts, tasks) | everything else | owner's choice | ✅ once a licence is set (§7.4) |
| edge-tts (Microsoft Edge read-aloud voices) | existing 7,174 mp3 files | no clear redistribution right | ⚠️ not used for new audio; existing files: owner decision (§10) |
| New Lithuanian voice | foundation audio | must allow redistribution | see 7.2 |

### 7.2 Voice for the foundation audio
Candidates, chosen after a listening test of 50 sentences (stress errors are the main risk for Lithuanian TTS):
1. **Piper "Reginutė"** (open model trained on the LIEPA corpus of Vilnius University, published under **CC BY 4.0**): free, runs
   offline in GitHub Actions or on the Mac, attribution required. *Verify the original model card before use.*
2. **Azure AI Speech, `lt-LT-OnaNeural` / `LeonasNeural`**: the same voice quality as today, under Microsoft's official
   terms (customer owns the output); free tier ~0.5 M characters/month, needs an Azure account with a card.
3. Not used: Meta MMS-TTS (CC BY-NC, non-commercial only), edge-tts (no clear terms).

Two voices (female + male) make the listening dialogues sound like conversations. Piper → if quality is acceptable;
otherwise Azure.

### 7.3 What gets audio
Every course word and its first example, every phrase, every listening dialogue line, the sounds lessons' dictations, the
reading texts of A1 units. Estimate ~4,000–5,000 files (~11,500 in total, under the 20,000-file Workers static-asset limit).
If it gets close: move audio to R2.

### 7.4 Licence files
- `LICENSE` (code): MIT.
- `content/LICENSE`: own content under **CC BY-SA 4.0** (compatible with the Wiktionary data it contains), with the
  third-party list in `NOTICE.md` (Tatoeba, Wiktionary, the TTS voice, LIEPA).
- Mini App: «Источники и лицензии» screen generated from `NOTICE.md`.

---

## 8. Work plan

| Phase | Work | Done when |
|---|---|---|
| **A. Safety net** | frozen legacy copies + golden tests; `untouched.sh` CI check; staging copy plan | tests pass on today's `main` |
| **B. Copies** | owner binding (claim, reject others, groups); `scripts/ci/*`; Setup / Update / Backup workflows for copies; owner-path detection; `docs/SETUP-COPY.md`; template repo; spike: template + Update with `GITHUB_TOKEN` | a staging copy set up from scratch by following the guide, in ≤ 8 manual actions; a second Telegram account gets only the one-line reply |
| **C. Profile + wizard** | `Profile` schema; legacy profile; `weekPlan`; profile-driven pace, reading, AI profiles, milestones, weekly; `track` filter; wizard + `/setup` + ⚙️; Lithuanian-only mode | golden tests identical; smoke: fresh copy → wizard → first lesson; LT-only shows no ES/FR |
| **D. Course engine** | course map schema + validation; course-order planner; unit screen («Курс») with progress and unit checks; phrase cards for LT; diacritics strict mode | staging copy runs units 1–2 with placeholder content |
| **E. A1 content** | sounds S1–S6; units 1–12 (words mapping, gap words, phrases, lessons, texts) | A1 complete on staging; owner review |
| **F. Skills** | listening (format, screen, audio), writing tasks, speaking situations, new reading task formats | used in units 1–12 |
| **G. Audio** | voice test + choice; `tts` with the new voice; audio for A1 | 50-sentence test approved |
| **H. A2 content** | units 13–24 + A2 audio | owner review |
| **I. Exam** | mock exam mode + 3 mock exams + exam strategy lesson | a mock exam scored correctly by NŠA rules (unit tests) |
| **J. Licences** | `LICENSE`, `content/LICENSE`, `NOTICE.md`, «Источники» screen | before the first colleague starts |
| **K. Pilot** | 1–2 colleagues start with A1 (A2 written while they learn) | feedback collected |

Order: A → B → C → D → (E + F + G in parallel, max 2 agents) → J → K pilot → H → I.
A beginner on Normal pace needs ~3–4 months for A1, so A2 and the exam stage are written while the first colleagues learn.

### 8.1 Reserved numbers (avoid clashes with the owner's own content work)
| What | Range |
|---|---|
| Foundation words and phrases | `lt-w-6001…7999`, `lt-p-6001…7999` (the owner's batches continue at `lt-*-4751`) |
| Foundation grammar | `lt-g-0201…0299` (own `order` sequence) |
| Foundation reading | `lt-r-0201…0299` |
| Listening / writing / speaking / exams | `lt-l-0001+`, `lt-t-0001+`, `lt-s-0001+`, `lt-x-0001+` |
| D1 migrations | `0011` (task/exam results), `0012` (spare) |
| Smoke files | `14-copy-owner.ts`, `15-wizard.ts`, `16-course.ts`, `17-exam.ts` |
| Branches | `feat/colleagues-*` (code), `content/lt-foundation-*` (content); merged into `main` only with all checks green |

---

## 9. Status (update as work lands)
| Phase | Status |
|---|---|
| Plan v2 | ✅ 2026-10-08 |
| A. Safety net | ✅ 2026-10-08, branch `feat/colleagues-a-safety-net`: frozen copies `packages/core/test/legacy/` (grammar, reading, planner, weekly) and `packages/llm/test/legacy/learner.ts`; `legacy-baseline.test.ts` in both packages (checked: changing `FR_START` by a week fails 2 tests); `scripts/ci/untouched.sh` + PR step in `ci.yml`; recipe `prompts/content/lt-foundation.md`. The staging copy comes with phase B |
| B. Copies | ⏳ built and merged 2026-10-08 (deployed: owner path unchanged, copy step skipped in CI): owner binding (`apps/worker/src/owner.ts`: claim code, strangers get one line, groups ignored, unclaimed copy does nothing); `scripts/ci/copy.ts` (configure / secrets / menus / reset-owner, `--self-test`); `scripts/ci/update-from-upstream.sh` (tested on temp repos, with and without workflow files); workflows `setup.yml`, `update.yml`, `backup-copy.yml`; copy deploy step in `ci.yml`; owner-only guards on `backup.yml`, `content-batch.yml`; guide `docs/SETUP-COPY.md`; smoke `14-copy-owner.ts` (second Worker in copy mode, 16 checks). **Left:** the real end-to-end run on a fresh Cloudflare + GitHub account (staging copy, needs the owner or a test account), owner ticks «Template repository» |
| C. Profile and wizard | ✅ 2026-10-08, branch `feat/colleagues-c-profile`: `packages/core/src/profile.ts` (`Profile`, `PACES`, `weekPlan`, `ruleLangsForDay`, `readingLangForDay`, `firstReadingLevel`, `visibleTo` for `track: foundation`, `newPerDayFor`); `track` field on items, lessons, texts; Worker `src/profile.ts` (profile + time zone loaded per request, `learnerItems`, `aiProfile`), `features/setup.ts` (`/setup`, `GET/POST /api/profile`, first lesson right after the wizard; refused on the original bot); grammar, reading, new words, placement, quiz distractors, AI tutor levels (`learnerProfileFor`), weekly LT hint and the quarterly self-check follow the profile (the self-check is off in copies until course milestones exist); Mini App wizard `features/Setup.tsx` (5 steps, exam date check against the pace), only the learner's languages shown; smoke `15-setup.ts` (copy wizard + original bot unchanged). Not yet checked visually in Telegram |
| D. Course engine | ✅ 2026-10-09, branch `feat/colleagues-d-course`: `packages/core/src/course.ts` (`Course` schema, `courseItemOrder`, `courseLessonOrder`, `unitProgress`, `currentUnit`; unit check pass = 80%); course map `content/lt/course/foundation.yaml` (34 units: s01–s06, u01–u24, e01–e04 with titles, topics, can-do; **u01 and u02 filled with 88 existing words**, the rest waits for phase E; gap words listed in its header) validated in `build-content.ts` (ids exist and are of the right kind, no word in two units, count of words without stress); Worker: new words and Lithuanian lessons follow the course for foundation learners (`learnerItems`, `learnerLessons`), `features/course.ts` (`GET /api/course`, unit page, unit check, «Я это знаю» via the placement logic), migration `0011_course.sql` (`course_check`); strict Lithuanian letters (`checkAnswer(…, strict)`) for learners with the A2 exam goal; Mini App `features/Course.tsx` (units with progress, unit page, 10-question check); smoke `16-course.ts` (copy) + original bot has no course |
| E. A1 content | ⏳ branch `content/lt-foundation-a1` (**waiting for owner review, not merged**). **Grammar for all 12 A1 units done:** `lt-g-0201…0218`, extended after the owner's gap review (2026-10-09) with `0219` Kas tai / šis, tas / Ar čia yra; `0220` question words + negation (niekas, nieko); `0221` adjectives (-as/-a, -us/-i, -is/-ė) + adverbs; `0222` gender of numbers 1–9 + age (metai); `0223` galiu / moku / reikia (+ genitive) / galima / turiu + inf.; `0224` ir / o / bet / arba / nes / todėl; `0225` pronouns mane / tave… and genitive after negation (tavęs); `0226` exception nouns (-uo, duktė, -is gender, dantis, žmonės, plural-only); `0227` exception verbs (three forms, t → č / d → dž, būk / duok / bėk) — 27 A1 lessons; explanations of 0202, 0204, 0211, 0216, 0218 completed (exercises unchanged). Age with metai: owner confirmed — A1 teaches *penki metai* (+ *vieneri* for 1, 21…), collective numerals (*penkeri*) stay in A2 (u22) — būti; gender + nominative; present tense; accusative + ordering; days/clock; locative; genitive (nėra, negation, quantity); numbers + euras; į / iš / transport; turėti + mano/tavo; nominative plural; patinka / mėgti; reflexive verbs; weather + seasons; dates; skauda / sergu / imperative; vocative + polite requests + asking to repeat; past tense. Russian only, Tatoeba examples; the build now rejects Ukrainian/Belarusian mentions in foundation content. **Words for all 12 units** (405: existing items + 21 gap items `lt-*-6001…6021`). Left for A1: stress marks for 62 course words (by hand, lkz.lt / ekalba), phrases 6–8 per unit, reading texts (2 per unit, exam formats), «этаж»; sounds lessons s01–s06 wait for the voice (phase G) |
| F–K | not started |

**How to start the next session:** read `CLAUDE.md` → this file (§3, §4, §8) → merge `feat/colleagues-a-safety-net` into `main` (tests, docs and a PR-only CI step: no runtime change), then branch `feat/colleagues-b-copies`.
Owner action before phase B ends: tick «Template repository» in the GitHub settings.

---

## 10. Decisions
**Recorded (owner, 2026-10-08):** personal copies, not a shared bot · explanations in Russian, no Ukrainian/Belarusian in the
new course · interface stays Russian · audio may be generated with a shareable licence · ES/FR content untouched,
Lithuanian-only possible · course from zero to the A2 exam.

**Still open (defaults used unless the owner says otherwise):**
1. **Licences:** code MIT, content CC BY-SA 4.0 (default).
2. **Voice:** decided after the 50-sentence listening test (Piper if good enough, else Azure).
3. **Existing edge-tts audio** (7,174 files, ES/FR/LT B-level): leave as is for now (default); later re-generate with a
   licensed voice or exclude from copies. (Re-generating ES/FR audio would touch only audio files, not content.)
4. **Stress marks / audio on the shared A1–A2 words** also appear on the owner's cards (improvements, nothing new to learn)
   — default yes.
5. **Who reviews Lithuanian content:** the owner reads every lesson and text (default); a native speaker review of the mock
   exams before the pilot is recommended.

## 11. Risks
| Risk | Mitigation |
|---|---|
| A refactor changes the owner's daily plan | legacy profile + golden tests vs frozen copies; staging first |
| A-level items leak into the owner's queue | `track: foundation` filter in each picker + test over the full content |
| GitHub limits for the Update workflow (workflow files, `GITHUB_TOKEN` pushes) | thin workflows; Update deploys itself; spike in phase B |
| Cloudflare token permissions or subdomain registration differ from the docs | spike in phase B on a fresh account; clear error texts in Setup |
| TTS stress errors teach wrong pronunciation | listening test before choosing; stress-marked text for the TTS where the voice supports it; ⚠️ report button on audio |
| Exam format changes | facts in §6.1 dated; check NŠA pages before writing mock exams and once a year |
| Free-tier limits per copy | each copy has its own limits; usage is like the owner's (~300 requests/day) |
| Content volume (~30 sessions) | A1 first, pilot early, A2 written while colleagues learn |

## 12. Sources
- NŠA, Lithuanian language exams for foreigners: https://www.nsa.smsm.lt/duk/lietuviu-kalbos-egzaminas-uzsienieciams/
- NŠA, results evaluation, Basic–I category (A1–A2) exam (PDF): https://www.nsa.smsm.lt/wp-content/uploads/2026/02/A1-results-evalution.pdf
- NŠA exam levels and registration: https://eksternams.nsa.smm.lt/exam-levels
- Lithuanian A2 content description (Ministry of Education, PDF): https://smsm.lrv.lt/uploads/smsm/documents/files/svietimas/A2_lygio_mokymo_programa.pdf
- Piper Lithuanian voice "Reginutė" (CC BY 4.0, LIEPA corpus): https://github.com/kubataba/sayfable-models/releases/tag/piper-lt-v1
