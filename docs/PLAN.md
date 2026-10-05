# Everyday Learning — Analysis & Implementation Plan (v4)

> **Goal:** learn something new every day, in small doses.
> **Priority:** **Lithuanian to B2 as fast as possible** (currently A2–B1). **Spanish** (beginner) second;
> **French** (not started) third. All three should be usable in some way by the end of 2027.
> **Budget:** free tiers + your existing Claude subscription. The Claude API is an optional extra.
> **Devices:** iPhone (main), MacBook (work), Windows laptop (occasional). All of them run **Telegram**.

## Status (updated as work lands) — last update 2026-10-05

**App: all planned features (1–17) are built and live.** What is left is content (table below) and real-use feedback.
| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Infrastructure: Cloudflare Worker + D1, auto-deploy on push, nightly backup, CI with unit + smoke tests | ✅ Done | |
| 2 | Bot: morning lesson + quiz polls, evening reminder, `/today`, `/lesson` | ✅ Done | |
| 3 | Mini App: Telegram login, flashcards (4 ratings), LT verb forms cards, LT noun genitives, placement test (words) | ✅ Done | |
| 4 | Settings (new cards/day per language, poll cap), `/pause`, `/stats`, streaks + freezes | ✅ Done | Mini App ⚙️ + `/stats`, `/pause`, `/new`; defaults LT 10 + ES 5 |
| 5 | Reverse cards (RU/EN → target, recall), part of settings per language | ✅ Done | added once the meaning card is known (2 correct answers) |
| 6 | Grammar lessons: rule of the day, exercises → cloze cards, weekday rotation | ✅ Done | `/rule`; rotation Mon/Wed/Sat LT (Sat: FR sounds first, see 14), Tue/Fri ES, Thu = LT reading, Sun = writing + report |
| 7 | Audio: TTS for words + examples, play button | ✅ Done | edge-tts mp3 committed to git (`pnpm content:audio`); 🔊 on flashcards, placement, grammar examples and exercise sentences (ids `<lesson>-e1`, `-x1`); no voice clips in the bot (too noisy) |
| 8 | AI layer (Groq + Gemini fallback, budget, usage log) + `/tutor` + writing & voice feedback | ✅ Done | `packages/llm` + `config/llm.yaml`; `/tutor [lt\|es] [topic]`, `/stop`, `/ai`; voice → Whisper (`whisper-large-v3`); `pnpm llm:eval` |
| 9 | Reading mode (graded texts, tap word → card) | ✅ Done | 📖 in the Mini App; glossary or AI lookup (cached); 3 questions; Thursday «Текст дня», `/read` |
| 10 | Weekly report, `/input` log, auto-adjust of new cards | ✅ Done | Sunday 18:00 report + `/week`; 🎧 in the Mini App |
| 11 | "Report a mistake" (bot + Mini App) | ✅ Done | ⚠️ on cards, `/report`; `pnpm content:reports` lists them |
| 12 | Automation: content batches, weekly writing review, quarterly self-assessment | ✅ Done | `/review` (in the Worker), quarterly `/check`; Claude Code content batches built but **switched off by choice** — content is prepared in Claude Code sessions |
| 13 | Mistakes → review cards ("✏️ Как правильно?") | ✅ Done | from tutor/feedback/voice corrections, up to 10 new per day |
| 14 | French sounds track (PLAN §3.3/§3.5) | ✅ Done | 10 micro-lessons `fr-g-0001…0010` (English, Tatoeba examples, dictation exercises with 🔊); Saturday = FR until 2027-03-31 while FR lessons are left, else LT; from 2027-04-01 Friday alternates ES/FR (`grammarLangsForDay` in `packages/core/src/grammar.ts`) |
| 15 | Grammar diagnostic in the placement test | ✅ Done | Mini App «Проверить, что я уже знаю» → «Грамматика»: 2 exercises per upcoming LT lesson; both right → «Отметить урок как пройденный» (no cards: `POST /api/grammar/lessons/:id/done {cards:false}`) |
| 16 | Suggested input sources | ✅ Done | `config/sources.yaml` (validated at build) → «Что послушать» in 🎧; one LT tip in the Sunday report when LT input < 3 h |
| 17 | Reading: own texts + adaptive level | ✅ Done | 📖 «＋ Вставить свой текст» (paste any article; stored only in D1, AI word lookups + 3 AI questions, task `reading_questions`); after reading «легко / нормально / сложно» → next «Текст дня» level (`nextReadingLevel`, default LT = B2); migration 0010 |
| 18 | "More today" on days with extra time | ✅ Done | New words: Mini App «➕ Ещё новые слова сейчас» / `/more` (one daily portion per active language), `/more es`, `/more lt 20` (max 30) — introduced as cards now, the next morning continues after them (`features/more.ts`, `POST /api/more`). Grammar: «➕ Следующее правило» after today's rule / on days without one, `/rule next [lt\|es\|fr]` (`GET /api/grammar/next`; today's rule stays; French grammar still waits for April). Reading was already on demand (📖 lists all texts). No migration; smoke `13-more.ts` |
| 19 | «Учить новые слова» — a separate mode for new words | ✅ Done | Mini App 🆕 (`screens/Learn.tsx`): groups of 5 → «знакомство» (full card, «Уже знаю» = Easy) → drill until each word is recalled twice in a row (word → meaning, then meaning → word; a miss comes back 2 cards later). Answers go to FSRS on the `:recog` card (Помню = Good, Не помню = Again) — two Goods in a row = graduation to review. Words in FSRS state New/Learning are **left out of «Повторить»** and of `due` counts, together with their forms/reverse cards (`NOT_LEARNING` in `db.ts`); `GET /api/learn`, `session.learning`. Morning lesson, `/more` and `/today` buttons open `?screen=learn`. No migration |
| 20 | Grammar: «📚 Пройденные правила» | ✅ Done | Mini App home + grammar screen: every rule sent as the rule of the day or marked done (`GET /api/grammar/history`), newest first, language chips + search; open → read again and redo the exercises. For a done lesson the answers go to its cloze cards (a miss comes back sooner). No migration; smoke in `05-grammar.ts` |

**Content — supply and next ids**
| Area | Now | Runs out (at default pace) | Next ids / where to continue |
|---|---|---|---|
| Lithuanian vocabulary | 2344 words (A2–B2; `lt-*-2034…2400` (2026-10-05) = B1–B2 topic gaps: emotions, health, housing, work & office, money, administration, society & politics, media, nature, travel, opinions & connectors, character adjectives, abstract nouns; 33 of them without an example) | ~late May 2027 (10/day; later if placement skips known words, sooner with «Ещё новые слова») | `lt-*-2401`: candidates `lt 41000 6000` (~60 used) then `lt 35000 6000` (partly used); thin topics: rarer connectors (juolab, tariamai — no Tatoeba examples), character adjectives; words without a good example are OK (empty id); recipe `prompts/content/lt-vocab.md` |
| Spanish vocabulary | 2360 items (A1–B1); the A1 core the first batches skipped (ranks 1–350) is `vocab/a1-0000-core-1129.yaml`; A1–A2 basics the frequency batches missed (connectors, colours, mayor/menor, gustar-type verbs, reflexives, feelings, everyday nouns; then kitchen, home, body, clothes, town, shopping, health, weather, school, tech, greetings, time phrases) are `vocab/a2-0000-basics-*.yaml` (es-*-1936…2360, 2026-10-05) — these file names sort before the B1 batches, so they are the next new cards; `vocab/b1-1332.yaml` = ranks 6850–8350, `b1-1614.yaml` = 8350–9850 | ✅ past Dec 2027 (§3.3 pace 5 → 4 → 5/day; target ~2,100 reached) | `es-*-2361` (only if wanted — supply is past Dec 2027): candidates `es 8350 1500` (partly used) or `es 9850 1500`; recipe `prompts/content/es-vocab.md` |
| Lithuanian grammar | 121 lessons — **B1/B2 grammar complete ✅** (2026-10-05) (Q1–Q4 + B1/B2 gap-fillers incl. numerals with nouns, causative pairs, word order, reflexive -si, argument connectors, Russianisms, participle phrases, formal e-mail phrases, idioms 2, tense/mood review, word formation, instrumental, dative in impersonal phrases, -tinas participle, genitive uses, prefix meanings, participles review, opinion & agreement, trends & figures, verta / užtenka / teko, spoken forms (einam, daryt, mokaus), complaints, case review, reported speech review, už / per / iš, tricky declensions akmuo / sesuo / širdis, numerals in cases, adjectives -us / -is, pronouns jis / šis / pats, savo / savęs, frequentative verbs (vaikščioti, -inėti), principal verb forms, purpose (kad + cond., eiti nupirkti duonos, pietums), negation (nė / nei / joks), nebe- / tebe- / be-, kad ir kas / vis tiek, namie – namo / -yn adverbs, nėra kur / nėra ko, toks – koks / kitas – kitoks, B2 mixed review 1, verb government 2 (klausti ko, vadovauti kam, tikėti kuo), nominalized participles (pradedantieji, miegamasis, gegužės pirmoji), compound tenses (esu buvęs, buvau išėjęs), question particles (ar, argi, nejaugi), į / pas / prie / ant / link, fractions (pusė, pusantro, trečdalis), o / bet / tačiau, modals (galėti / mokėti / turėti / privalėti), time adverbs (ką tik, kol kas, iki šiol), yra / būna / būdavo, question words in cases (kieno, ko, kuo), B2 mixed review 2, feelings (gaila, gėda, nusibodo), plural-only nouns (durys, marškiniai, lubos; dveji, vieneri), reflexive imperative (nesijaudink, nusiramink), quantity words (dauguma, daugelis, keli, keletas), story connectors (iš pradžių, staiga, galiausiai), age (vienerių metų, mano amžiaus), health (skauda galvą, sergu gripu), kiekvienas / visas / abu / bet kuris, perception (mačiau, kaip…; girdėjau tave verkiant), feminine forms & surnames (-ienė / -aitė), tapti / pasidaryti / likti / virsti, B2 review: past conditional, weather (lyja, šąla), prices (kainuoja du eurus, mokėti kortele), šalia / priešais / tarp / pro / palei, žinoti / pažinti / mokėti, žiūrėti / matyti / klausytis / girdėti, dėti / statyti / kabinti, patinka / mėgstu / myliu, polite requests, beveik / vos ne-, kalbėti / sakyti / pasakoti, irgi / taip pat, word-choice review, noun declension tables sg/pl, locative uses, adjective agreement in all cases, adverbs -ai/-iai vs neuter (gražiai / gražu), comma rules, nasal vowels ą ę į ų, years / centuries / decades + official style (atsižvelgiant į, remiantis), present-tense types (dirba / myli / žino); nebent added to 0025) | ~early Oct 2027 (Mon/Wed; also Sat once the FR sounds lessons are done; sooner with «Следующее правило») | `lt-g-0122`: nothing required for B2 is left. Decide («Open questions» 1) between optional C1 extras (idioms 3, reported speech in news) and a review rotation; Tatoeba is thin for the remaining topics |
| Spanish grammar | 72 lessons (A1–B1 incl. future/conditional perfect, subjunctive in relative clauses, connectors, pronoun placement, ser/estar meaning pairs, false friends, opinion + subjunctive, lo + adjective, seguir/llevar/acabar de…, imperfect subjunctive after past verbs, passive with ser, relatives el que / lo cual, uses of the conditional, indirect questions, por/para review, subjunctive review, time expressions (dentro de, al cabo de, a los…), pluperfect subjunctive, conocí/conocía & supe/sabía, estar + participle, se me olvidó, verbs + preposition, become: ponerse / volverse / hacerse / quedarse, quizás / a lo mejor / puede que; 0061–0072 (2026-10-05): object pronouns review, alguien/nadie/ningún, commands review, muy/mucho/demasiado/bastante, si-clauses review, ya/todavía/aún, infinitive vs gerund, obligation (tener que / hay que / deber / hace falta), pero/sino, accent pairs (tú/tu, sí/si), todo/cada/cualquier, nominalisation & formal register) | ~mid-June 2027 (Tue/Fri; Fri alternates with FR from April) | `es-g-0073` (order 73): grep titles first — already covered: soler, ir a, diminutives, hay/está, gustar-type, preterite irregulars, -ísimo |
| Lithuanian reading | 115 texts: 18 B1 + 33 B2 (0019–0051: society, history, culture, nature, Klaipėda, students, weather, shopping habits, Kaunas, forests & mushrooms, sport, music, literature & book smugglers, Vilnius start-ups — see files) + 64 C1 (0052–0115: dialects, emigration & return, the village today, theatre & cinema, loanwords & language policy, the 1990s, the Baltic Sea, AI & work, health habits, housing, civil society & volunteering, the four-day week, Aukštaitija lakes & tourism, cars vs cycling & transit, ageing & pensions, the euro, LT–PL relations, sign language & accessibility, Curonian Spit, misinformation, cuisine, Song Festival, Litvak heritage, energy independence, basketball, mental health, school & exams, Vilnius vs regions, wolves, 20 years in the EU, deportations, amber, Kaunas modernism, the language's age, Vilnius Old Town, food waste, smartphones & childhood, labour immigration, partisans, lasers, Kernavė, Vytautas, January 1991, Sąjūdis, Klaipėda, Karaim & Tatars, wetlands, organic farming, sauna, design, corruption & trust, local government, women in history, the Church today, humour, Hill of Crosses, NATO & the German brigade, cyber security, Sept 1, film festivals, storks, the Nemunas, gambling ads, ageing villages) + own texts | C1 texts: 64 Thursdays → ~Dec 2027 (then B2 as the nearest level) | `lt-r-0116` — **C1**, ~200–300 words, **12 per session** (ideas: Čiurlionis, bees & honey, Vilnius University, sutartinės, second-hand & fast fashion, Druskininkai & spa towns, rye bread, Rail Baltica, Lithuanian nanosatellites, the Statutes of Lithuania, civic fundraising for Ukraine, animal shelters) |
| Spanish reading | 2 texts (A1) | — (read on demand) | `es-r-0003` |
| French | 10 sounds lessons (Saturdays, ~Oct–early Dec 2026) + **1174 words** (`fr-w-0001…0521` A1 topics; `fr-w-0597…0955` A1–B1, ranks 1200–2500: work, study, feelings, media, town, health, abstract nouns, verbs; `fr-w-0956…1249` (2026-10-05): A1 gaps — adverbs & connectors, numbers 11–16 / 30–60, food & kitchen, home, body, clothes, travel, town, shopping, family, work, health, weather, reflexive verbs, adjectives, feelings + 19 lemmas from ranks 1200–2700; gender on every noun, ES comparisons) + **75 survival phrases** (`fr-p-0522…0596`, Tatoeba sentences verbatim; the phrasebook sorts first) + **25 A1–A2 grammar lessons** `fr-g-0011…0035` (être/avoir, articles and gender, present -er, negation, questions, aller + inf., partitive, adjectives, possessives, passé composé with avoir / être, reflexive verbs, imparfait; faire/prendre/venir, pouvoir/vouloir/devoir/savoir, dates & time, à/en/au + places, imparfait vs passé composé, imperative, object pronouns, y / en, comparatives, qui/que/où, futur simple, depuis / il y a / pendant / dans) | starts April 2027: set `/new fr 5` then (not automatic); ~1,250 items ≈ 9–10 months at 4–5/day (to ~Jan 2028); 25 lessons ≈ a year of alternate Fridays (enough to ~Apr 2028) | French grammar uses `order` **101+** — `pickLesson` holds those until `FR_START` (order ≤ 99 = sounds track, Saturdays before April). Supply covers Dec 2027 — next only if wanted: `fr-g-0036` (order 126; e.g. conditionnel, subjonctif basics, c'est / il est, ce / cet / cette, verbs + à / de); vocabulary `fr-*-1250`, `pnpm content:candidates fr 1200 1500` mostly unused (only 19 picked) — continue there or `fr 2700 1500`; recipe `prompts/content/fr-vocab.md` |
| Stress marks for LT words | 1017 of 2344 (`content/lt/stress.yaml`, from English Wiktionary via `pnpm content:stress`; merged at build) | — | ~1,330 words have no Wiktionary entry (`.cache/stress-skipped.txt` after a run): add by hand from lkz.lt / Vikižodynas; re-run `pnpm content:stress` after each new LT batch |

**Next steps (in order, as of 2026-09-29):** Lithuanian grammar: B1/B2 complete (121 lessons, to ~early Oct 2027) — next only a review rotation or optional extras `lt-g-0122+`, ask first; and Spanish grammar `es-g-0061+` (first to run out,
Feb–Mar 2027) → more LT C1 reading `lt-r-0116+` (64 so far, to ~Dec 2027; 12 per session) → LT vocabulary `lt-*-2034` → ES vocabulary `es-*-1936` → stress marks for the ~800 LT
words Wiktionary doesn't cover (lkz.lt) → French: ✅ enough to Dec 2027 (25 grammar lessons, 1,174 words + 75 phrases, 2026-10-05). The learner finds B2 texts easy
(Oct 2026) and the app now picks C1 — write new LT texts at **C1** (essay/opinion register, impersonal passives, participle and
gerund clauses, abstract vocabulary; questions on the author's view and inference).

**Inputs for the next planning round (as of 2026-09-29, after the content sessions):** demand = the §3.3/§3.6 pace from
2026-10-01 to 2027-12-31, before placement skips known words.
| Area | Needed to Dec 2027 | Have | Gap | Note |
|---|---|---|---|---|
| LT words | ~3,650 (10/day to Mar, 8, 7, 5) | 1,799 | ~1,850 | Tatoeba LT–RU (~99k pairs) is thinning out beyond rank ~35,000: most unused candidates are inflected forms or have no example |
| ES words | ~2,100 (5, 4, 5/day) | 1,128 | ~1,000 | the Dec 2027 target is A2 (~1,500 words) — the §3.3 pace goes beyond it |
| FR words | ~1,200 (4–5/day from Apr 2027) | 0 | ~1,200 | + ~300 phrases (§3.5); Tatoeba `fra`–`eng` is large |
| LT grammar | ~185 (Mon/Wed, + Sat from Dec 2026) | 121 | ~64 | ✅ B1/B2 inventory complete (review 2026-10-05, below); the rest would be review / mixed B2 tasks |
| ES grammar | ~110 (Tue/Fri, Fri alternates with FR from Apr) | 44 | ~65 | already at B1 topics while the target is A2 |
| FR grammar | ~20 (alternate Fridays from Apr 2027) | 10 sounds | ~20 A1 | |
| LT reading | ~65 Thursdays | 27 B2 (+18 B1) | ~38 B2 | fewer if pasted own texts replace some Thursdays |
| LT stress marks | all words | 850 / 1,799 | ~950 + every new word | not in Wiktionary → lkz.lt by hand |

Decisions that change the size of the gap (2, 3 and 5 decided by the learner on 2026-09-29/30):
1. **Grammar after the topic list:** new lessons forever, or a **review rotation** (re-run earlier lessons with fresh exercises,
   quarterly mixed-review lessons) and fewer new-rule days (e.g. LT Mon/Wed only, ES once a week)?
2. ✅ **Spanish: keep the §3.3 pace (5 → 4 → 5/day) and add words** (decided 2026-09-30) — ~2,100 items by Dec 2027, i.e.
   ~800 more after es-*-1331, aiming past A2 toward B1 vocabulary. Prepare them in batches of ~250.
3. ✅ **LT words without a good Tatoeba example are OK** (the learner looks examples up separately): leave the tatoeba id empty in
   the batch row — `batch-to-yaml.py` then writes the item without examples. Never write examples yourself.
4. **Placement:** actual skip rate after the learner's placement test — it may cut the LT gap a lot; re-plan once known.
5. ✅ **No new audio for now:** don't run `pnpm content:audio` for new content (7,174 files / ~119 MiB, close to the free-plan
   static-assets file limit). Items without audio simply show no 🔊. Later: remove audio of old, already-learned items and
   generate audio for newer ones instead.

**Coverage review (2026-09-29):** Spanish was missing most of the A1 core (the first batches started at frequency rank 350) —
fixed with the core batch above; checked against a topic list (pronouns, ser/estar, question words, numbers, days, months,
colours, family, body, food, house, clothes, places, transport, weather, directions, shopping, health, jobs, feelings, core
verbs, function words). French had no vocabulary — first A1 batch added. When starting a new language or level, run such a
topic checklist before relying on frequency ranks.

**Lithuanian grammar B1/B2 coverage review (2026-10-05):** the 113 lessons `lt-g-0001…0113` were checked against a B1/B2
inventory (cases and declensions, adjectives and adverbs, pronouns, numerals, all tenses and moods, the full participle system
incl. *pusdalyvis / padalyvis / būdinys*, passive and impersonal, reported speech, prefixes and aspect, reflexives, clause types and
connectors, government, word formation, register). Everything in §3.4 Q2–Q4 was covered, mostly with a review lesson. These areas
had no lesson of their own — **all written the same day as `lt-g-0114…0121`, so B1/B2 grammar is ✅ complete:**
1. **Noun declension tables, singular + plural** (§3.4 Q1 «all declensions sg/pl»): the five types side by side (*-as/-is/-ys*,
   *-a/-ė*, *-is* fem./masc., *-us*, *-uo*); only the tricky nouns (0063) and single-case lessons exist. Focus: plural
   dative / instrumental / locative — *draugams, draugais, drauguose*; *knygoms, knygomis, knygose*; *upėms, upėmis, upėse*; *naktims, naktimis, naktyse*.
2. **Locative case uses** (only lines in 0034/0035/0060): place *mieste, namuose*, time *žiemą* vs *žiemos metu*, *ateityje,
   XX amžiuje*, abstract *darbe, susirinkime, knygoje rašoma*, set phrases *mano akyse*.
3. **Adjective + noun agreement through all cases, plural included** (*su gerais draugais, naujuose namuose, gražiomis
   dienomis*). 0065 gives only the *-us/-is* adjectives; nothing drills *-as/-a* through the cases.
4. **Adverbs from adjectives:** *-ai / -iai / -iau* (*gerai, gražiai, karštai*), adverb vs neuter (*gerai* vs *gera*, *gražiai* vs
   *gražu*) — only seen in passing in 0032 and 0065.
5. **Comma rules for B2 writing:** before *kad, nes, kai, jei, nors, kuris*; participle and *pusdalyvis / padalyvis* phrases;
   introductory words (*žinoma, be to, deja*); address; *ir* without a comma; only fragments in 0012, 0042, 0044.
6. **Spelling of nasal vowels (*ą, ę, į, ų*) in endings:** acc. sg. *knygą, upę, širdį*; gen. pl. *-ų*; present-tense and
   participle forms (*esąs, skaitęs*, *bijo – bijąs*); short rules by ending. A very common error in learners' written
   Lithuanian and B2 writing is scored on it.
7. **Formal register and dates, centuries:** officialese (*atsižvelgiant į, vadovaujantis, pagal, dėl*, nominal style), plus
   *XX a. 9-ajame dešimtmetyje*, *2027 m. spalio 5 d.* and how to read them aloud. Part of this is in 0014 and 0045.
Not gaps (already covered, often in passing): reciprocal *susitikti* (0041), evidential *čia būta žmonių* (0018), *kol ne-* (0027).
Small items: *nebent* («unless»), present-tense types *-a / -ia / -i / -o* (*gyvena, piešia, myli, žino*);
0069 has only the three principal forms and past endings. The grammar diagnostic will let the learner skip whatever they know.
Done 2026-10-05: 0114 declensions, 0115 locative, 0116 adjective agreement, 0117 adverbs vs neuter, 0118 commas, 0119 nasal
vowels, 0120 dates & official style, 0121 present-tense types (the small item); *nebent* added to the explanation of 0025.
Note: they run last by `order` (~Sep 2027); the learner can pull them earlier with «Следующее правило» or skip known ones via the diagnostic.

**How content is made (workflow that worked in Sep 2026):**
- *Examples:* `python3 scripts/tatoeba.py <lt|es|fr> '<regex>'` or `--words w1 w2 …` (auto-pick 2 per stem) → read every pair, drop
  mismatches (the stem search often hits a different word) → put the id in the batch/lesson; never write examples yourself.
- *Vocabulary:* `pnpm content:candidates` → pick lemmas (skip names, violence, words already in `content/<lang>` — `content:validate`
  rejects duplicates) → batch file in `scripts/batches/` → `batch-to-yaml.py` → validate → (LT) `pnpm content:stress` → `pnpm content:audio`.
- *Grammar lessons and reading texts:* written as data in a small script or by hand as YAML (format: existing files); lessons 3–5 examples
  + 6–8 cloze exercises; texts: B2 = aim for 250–350 words — drafts consistently come out ~20% shorter than planned, so count
  (`content:validate` enforces the range) and add a paragraph if needed.
- *Before every push:* `pnpm test` and `pnpm smoke`; push only if smoke **exits 0** (don't rely on grepping its output).

**Resuming in a new session:** read `CLAUDE.md` (repo root) first — commands, structure, content rules, and lessons learned.
Then this table, `git branch -a` (unmerged `feat/*`, `content/*`, `grammar/*`, `reading/*` branches), and `gh run list -L 3`.
Every push to `main` that passes CI is deployed automatically.

**Waiting on the learner:** SETUP.md step 6 (paste `prompts/tutor/claude-project.md` into a Claude app Project); real-use testing on
iPhone and Mac; reporting wrong content with ⚠️ / `/report`.

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

### 5.1 Provider layer (as built)
`packages/llm`: small adapters on plain `fetch` (no SDKs, so the Worker stays small) for any **OpenAI-compatible** API
(Groq, OpenRouter, Ollama), **Gemini** `generateContent` and the **Anthropic** Messages API. The app asks for a **task**;
`config/llm.yaml` maps each task to a chain of `provider:model` pairs. The router:
- tries the chain in order, skipping providers that are disabled or have no key set;
- retries a provider once on 429/5xx/timeouts (short pause), then falls back to the next one;
- for JSON tasks asks for JSON mode, validates the answer with zod and treats invalid JSON like a 5xx (retry, then fallback);
- logs every call to D1 `llm_usage` (task, provider, model, tokens / audio seconds, estimated cost, latency, short error — never the text);
- **budget guard:** a provider with `monthly_budget_usd` is skipped once this month's estimated cost reaches it.

`scripts/build-llm.ts` (part of `pnpm build`) validates the config and bundles it with the prompts (`prompts/tutor/chat.md`,
`prompts/feedback/writing.md`) into the Worker. `pnpm llm:eval` runs 21 learner mistakes (14 LT, 7 ES) through every enabled
chat model with the real feedback prompt and prints a comparison table (keys from `apps/worker/.dev.vars`; not run in CI).
`/ai` in the bot shows this month's calls and estimated cost per model.

```yaml
# config/llm.yaml (defaults: $0 at runtime). Model names live only here.
tasks:
  tutor_chat:       [groq:openai/gpt-oss-120b, google:gemini-3.8-flash]   # add anthropic:claude-haiku-4-5 if you enable the API
  writing_feedback: [groq:openai/gpt-oss-120b, google:gemini-3.8-flash]
  answer_check:     [groq:openai/gpt-oss-20b,  groq:openai/gpt-oss-120b]
  transcribe:       [groq:whisper-large-v3, groq:whisper-large-v3-turbo]  # voice messages; then tutor_chat / writing_feedback
providers:
  groq:      { type: openai,    key_env: GROQ_API_KEY, … }
  google:    { type: gemini,    key_env: GEMINI_API_KEY, … }                # optional; skipped while the key is absent
  anthropic: { type: anthropic, key_env: ANTHROPIC_API_KEY, monthly_budget_usd: 3, enabled: false }
```
Switching to Claude later is `enabled: true`, an `ANTHROPIC_API_KEY`, and one line per task.
Privacy: only the learner's practice text (or voice clip, kept in memory only) goes to the provider; free tiers may use it for training.
Production logs contain lengths, language and provider — never the text or keys.

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
Audio: `edge-tts` (`lt-LT-OnaNeural`, alt `LeonasNeural`; `es-ES-ElviraNeural`; `fr-FR-DeniseNeural`), speed −10%; fallback is
the Google Cloud TTS free tier. Per item: the word (LT verbs: all three forms, LT nouns: with the genitive; stress marks are not
spoken) → `<id>.mp3`, and the first example → `<id>-ex.mp3`, in `apps/miniapp/public/audio/<lang>/`. `pnpm content:audio`
(scripts/tts.py) is incremental via `audio/manifest.json` (id → text hashes) and deletes files of removed items; setup in
[SETUP.md](SETUP.md) (Step 7 → Audio). Files are committed to git, so deploys need no Python. Size: edge-tts outputs
48 kbps mono mp3, ≈16 KB per file (Sep 2026: 464 files, 7.6 MiB for 237 items); ≈3,000 words/year → ≈6,000 files, ≈100 MB,
well under the Workers static-asset limits (20,000 files, 25 MiB per file). If the repo grows too big, move audio to R2 later.

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

### 6.5 Grammar lesson format
One lesson per file: `content/<lang>/grammar/<nnnn>-<slug>.yaml` (schema `Lesson` in `packages/core/src/schema.ts`).
```yaml
id: lt-g-0002            # <lang>-g-<number>
cefr: A2
order: 2                 # lessons of a language come in this order (unique per language)
title: "Будущее время: dirbsiu, dirbsi, dirbs"   # RU for LT, EN for ES/FR
explanation: { ru: "…" } # short paragraphs; **bold**, *italic*, "- " lists
comparison: { ru: "…" }  # optional: vs Russian/Ukrainian (LT) or English (ES/FR)
examples:                # 3–5, Tatoeba first (copied verbatim by id)
  - { text: "Rytoj eisiu į mokyklą.", translation: "Завтра я пойду в школу.", source: "tatoeba:1501577" }
exercises:               # 4–8; append-only: the Nth exercise becomes review card lt-g-0002:clozeN
  - { type: cloze, text: "Rytoj aš ___ iki vėlumos.", answer: dirbsiu, also: [], hint: dirbti, translation: "Завтра я буду работать допоздна." }
```
The rule of the day is the next not-done lesson of the weekday's language (§3.6); "Готово" in the Mini App turns its exercises into cloze cards.

### 6.6 Reading texts
One text per file: `content/<lang>/reading/<nnnn>-<slug>.yaml`, validated by `pnpm content:validate`.
```yaml
id: lt-r-0001            # <lang>-r-<number>
cefr: B1                 # length is checked: A1–A2 60–150 words, B1 120–250, B2 120–350
title: Naujas butas      # in the target language
topic: переезд           # in the explanation language
source: generated        # or the URL of an adapted original
text: |                  # paragraphs separated by a blank line
  Praėjusį mėnesį ...
glossary:                # optional; tapping these words needs no AI call
  - { word: išsinuomojome, lemma: išsinuomoti, meaning: "снять (в аренду)", item: lt-w-0012, note: "прош. вр., мы" }
questions:               # exactly 3, in the target language
  - { q: "Kodėl ...?", options: ["...", "...", "..."], answer: 0 }
```
Glossary `word`s must occur in the text, meanings are in the explanation language, and an `item` link must point to the course word
with the same dictionary form. Other words are looked up by the AI (`word_lookup` in `config/llm.yaml`) and cached per word.
First texts (Sep 2026): 4 Lithuanian B1 (flat, doctor, Trakai, work meeting) and 2 Spanish A1, written with an LLM and checked line by line.

**Levels (since Sep 2026):** the learner found B1 texts too easy. New Lithuanian texts are **B2** (250–350 words: participles,
passive, reported speech, Q4 connectors; news/society/opinion topics; questions on main idea and inference). The Thursday text
follows the learner's rating after each text (easy → a level up, hard → a level down; with no rating yet Lithuanian starts at B2).
**Own texts:** in 📖 the learner pastes any article (e.g. LRT) — it is stored only in D1 (never the public repo), gets AI word
lookups and 3 AI questions. This is the authentic-input track (PLAN §11), available from Q1 instead of Q3–Q4.

---

## 7. Telegram bot
| Command / input | What it does |
|---|---|
| Menu **▶ Learn** | Opens the Mini App |
| `/today`, `/stats` | Plan and what's left; progress per language |
| `/read` | Next unread text (Thursday morning it comes by itself as «📖 Текст дня») |
| `/rule` | Rule of the day now (grammar lesson in the Mini App) |
| **`/tutor [lt\|es] [topic]`** | Conversation with an AI tutor (default Lithuanian at B1; `es` = very simple Spanish). Each reply: the answer in the language, then **✏️ Исправления** (Russian for LT, English for ES). Text and voice go to the tutor while the session is open; the last ~10 exchanges are the context. Mistakes are saved (for cloze cards later) |
| `/stop` | Ends the tutor session (also ends by itself after 3 h of silence) |
| `/ai` | AI calls and estimated cost this month, per provider/model |
| Voice message | Transcribed by Whisper ("🎙 Я услышал: …"), then a tutor reply (in a session) or feedback like a text |
| Text in a target language | Writing feedback: corrected text + one-line explanations (LT/ES/FR detected from letters and common words) |
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
