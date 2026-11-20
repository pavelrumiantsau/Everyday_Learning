# Ukrainian grammar section: plan (draft, 2026-11-20)

> **Goal:** fix Ukrainian grammar up to C1, following the learner's course «Грамматика украинского языка: полный курс до C1»
> (53 pages, 13 parts + appendices, dated 2026-11-15). A **separate section of the Mini App**. You open blocks when you want them;
> each block gives the rule and a large exercise bank.
> **Hard rule:** the existing flow (bot messages, rotation, reviews, polls, streaks, reports, copies) behaves exactly as before.

## Status (2026-11-20, branch `feat/uk-grammar`)

| Phase | State |
|---|---|
| 0 Fact-check, recipe, tools | ✅ `UK-GRAMMAR-ERRATA.md` (first pass; 🔎 rows are checked when their block is written), `prompts/content/uk-grammar.md`, `scripts/uk-check.py` (LanguageTool, cached in `.cache/uk-check/`). ⏳ VESUM check (word forms exist) not built yet |
| 1 Engine + pilot | ✅ `packages/core/src/uk.ts` + `uk-schema.ts` (+ tests), `build-content.ts` → `generated/uk.json`, migration **0014**, Worker `features/ukrainian.ts` (API only, 404 in copies), Mini App `features/Ukrainian.tsx` (map, block: rule / tables / mistakes, practice with a retry of wrong ones, all 6 exercise types), smoke **21**. Pilot blocks: `uk-b-0106` stress, `0206` у/в, `0410` vocative, `1201` calques ① (112 exercises) |
| 2 Diagnostic, review, part tests, cheat sheet | ✅ diagnostic per part, ✅ own FSRS mistakes queue («Повторить ошибки»); ⏳ part tests, cheat sheet (Appendix A), search; ⏳ mastered blocks coming back now and then |
| 3 Content | ⏳ 67 of 95 blocks (1642 exercises): **Parts 1–8 complete** (`0101…0813`), `1201`. Next: Part 9 (`0901…0906`), Part 10 (`1001…1006`). Size: `uk.json` 171 KB for 25 blocks (≈ 650 KB for all 95, next to 4.5 MB of other generated content) — watch the Worker bundle; fallback in §3 |

Also in this branch: `build-content.ts` normalises paths to "/" so `content:validate` works on Windows too.

## 1. Who it is for, and what follows from that

The learner already speaks Ukrainian and is a native Russian/Belarusian speaker. The problem is **interference from Russian**,
not missing knowledge. The course is built around this: every part ends with «Типичные ошибки», and Part 12 is all calques.
For the section this means:

- **Diagnose first.** A short test finds the blocks where the learner actually makes mistakes; the other blocks can be skipped.
- **Mostly contrast exercises:** pick the right form (у/в, з/із/зі, -а/-у), find and fix the Russianism, judge whether a
  sentence is right. Plain fill-in exercises play a smaller role.
- Every answer shows **why** (one line, in Russian) right away. For someone fixing habits, this matters more than the score.
- Comparisons with Russian, Belarusian and Lithuanian are **kept** (the course uses them). The CLAUDE.md rule against
  UA/BE comparisons applies only to Lithuanian foundation content.
- Explanations and UI are in **Russian**; terms, examples and exercises are in **Ukrainian** (as in the course and the LT lessons).

## 2. What the document contains (analysis)

| Part | Topic | Subsections | Main traps for a Russian speaker |
|---|---|---|---|
| 1 | Phonetics | 10 | no devoicing, [ɦ], hard consonant before е, no akanye, [ў], stress (ви́-, кіломе́тр) |
| 2 | Alternations, euphony | 9 | о/е→і, г/к/х→з/ц/с (на нозі), у/в, і/й, з/із/зі |
| 3 | Orthography (Правопис 2019) | 8 | ь, apostrophe, doubling, з-/с-, «правило дев'ятки», пів окремо, проєкт |
| 4 | Noun | 12 | gender (біль m.), -ові, genitive **-а/-у**, **vocative**, surnames |
| 5 | Adjective | 6 | най-, вищий за/від/ніж (not чим), no short forms |
| 6 | Numeral | 6 | два роки (nom. pl.), півтора року, котра година, пів на третю |
| 7 | Pronoun | 7 | до нього / до його брата, свій, який vs котрий, ні з ким |
| 8 | Verb | 12 | synthetic future, ходімо, -но/-то, no -ущ-, **прочитавши** trap, чинний |
| 9 | Adverbs, function words | 6 | Russian «по» → за/з/на/через, чи, ніж |
| 10 | Syntax, government | 6 | дякувати кому, хворіти на, іспит з, минулого року |
| 11 | Punctuation | 4 | almost Russian; vocative commas, quotation marks, abbreviations |
| 12 | Russianisms, calques, surzhyk | 6 | брати участь, вживати заходів, наступний, скасувати… (~80 pairs) |
| 13 | C1 stylistics | 6 | registers, business letter, connectors, synonyms, idioms |
| App. | Cheat sheet of 15 rules, path to C1, dictionaries, sources | — | |

**About 98 subsections; many pages are tables** (declensions, conjugations, «неправильно → правильно»). The section therefore
needs **tables** and **wrong → right pairs** as data, not only prose.

**The document needs a fact-check before it becomes content** (it states that only the Правопис 2019 changes and the case
endings were checked against sources). Things found on a first read:
- 2.5: «зависть — зависливий» is not Ukrainian (заздрість — заздрісний); this row needs a different example.
- 1.9: the stress table pairs «чорно́слив» with Russian «черносли́в»; check against goroh.pp.ua (the Ukrainian norm is likely
  чорносли́в, which would make this row wrong). Check the whole table the same way.
- 1.3: «може наближаться» mixes Ukrainian and Russian (typo). 1.9: «ви - вимо́га» is garbled text.
- 12/10: «сміятися над» is listed as wrong; dictionaries give «сміятися з» as preferred, but «над» is not an error. Mark
  variant norms as variants and don't count them as mistakes.
Result: `docs/UK-GRAMMAR-ERRATA.md`, a list of corrections. The PDF itself stays as it is.

## 3. Isolation: how the current flow stays unchanged

Why this needs care: `Db.countDue()` counts **all** rows of `card_state`, so Ukrainian cards stored there would show up in
«Повторить», quiz polls, the evening reminder and the weekly report. `LANGS` also drives `Schedule.new_per_day` (a record
that requires *every* language), and `build-content.ts` treats any unknown YAML under `content/` as a vocabulary file.

| Decision | Effect |
|---|---|
| `uk` is **not** added to `LANGS` / `Schedule` / `Prefs` / `EXPLANATION_LANG` | the original plan, rotation, settings and copies stay as they are |
| Own module `packages/core/src/uk.ts` (schema, session picking, mastery, answer check) | no change to `grammar.ts` / `Lesson` |
| Content in `content/uk/blocks/`; `build-content.ts` skips it in the item loop and validates it separately → `apps/worker/src/generated/uk.json` | `LESSONS`, `ITEMS` and the legacy baseline stay the same |
| Own tables (migration **0014_ukrainian.sql**): `uk_block`, `uk_answer`, `uk_card` (own FSRS queue) | nothing goes into `card_state`, `review_event`, `activity_day` or `grammar_*` |
| Worker feature `features/ukrainian.ts` with **only `api`** (no commands, `onTick` or `onMessage`), placed before `tutor` | bot messages, the command menu and the morning/evening logic are byte-for-byte the same |
| Mini App feature `features/Ukrainian.tsx`; the home entry shows only for the owner (no profile) | personal copies don't see it |
| Tests: `legacy-baseline` unchanged and passing; new unit tests for `uk.ts`; smoke **`21-ukrainian.ts`**: answer UA exercises, then check that `countDue`, the morning lesson, the evening reminder and `/stats` are unchanged | proof, not just intent |
| `scripts/ci/untouched.sh` (ES/FR) still passes | Spanish and French untouched |
| Branches `feat/uk-grammar` (engine) and `content/uk-grammar-*` (content), pushed through PRs | `main` deploys only after smoke passes |

**Bundle size:** about 3,000 exercises ≈ 1.5–2 MB of JSON before compression. Check with `wrangler deploy --dry-run`. If the
Worker gets too big, serve the blocks as **one static JSON per part** (13 asset files) that the Mini App fetches; the Worker
keeps only the ids and answers it needs to check results.

## 4. How it works for the learner

**Home → «🇺🇦 Украинский: грамматика»** opens the section:

1. **Карта курса**: 13 parts → blocks. Each block shows a status: *закрыт* (not opened) · *открыт* · *в работе (n %)* ·
   *освоен* ✓ · *пропущен (знаю)*. A block opens only when you tap it («Открыть блок»): nothing arrives by itself.
2. **Block screen**, three tabs:
   - **Правило**: short explanation (markdown-light), **tables**, «✗ → ✓» pairs, 3–5 examples, a link to the PDF section.
   - **Тренировка**: a session of 10 exercises (unseen first, then ones you got wrong), instant check and a line on why.
     At the end the wrong ones come back once more. «Ещё 10» keeps going until the bank is used up, then mixes again.
   - **Мои ошибки**: the block's exercises you got wrong, with the right answers.
3. **Диагностика** (recommended as the first step): 2 exercises per block, about 190 in total, done in parts (one part at a
   time). Both right → the block is offered as «пропущен (знаю)». A wrong answer → «рекомендован», which sets the order on the map.
4. **Повторение**: exercises you got wrong come back on an FSRS schedule in a **separate** Ukrainian queue with its own counter in the section.
   Once a block is mastered, a few of its exercises come back now and then so the rule isn't forgotten.
5. **Контрольная части**: after the blocks of a part, a 20-exercise mixed test from all of them. ≥ 85 % → the part is marked done.
6. **Шпаргалка**: the 15 rules from Appendix A, each linked to its block, plus search over rules («-ові», «пів», «чи»…).
7. ⚠️ **«Ошибка в задании»** on every exercise, using the existing report feature (ids `uk-b-…:x…`; check that `report` accepts them).

**Mastery of a block:** every exercise answered at least once, and ≥ 85 % right over the last 20 answers.

## 5. Content format

One block per file: `content/uk/blocks/<part>/<id>-<slug>.yaml`, id `uk-b-PPNN` (part, number; e.g. `uk-b-0410` = vocative).

```yaml
id: uk-b-0410
part: 4
order: 10
title: "Звательный падеж (кличний відмінок)"
source: "§4.10"              # section of the PDF
level: B2                    # B1 / B2 / C1: used for the order of the diagnostic and the map
rule:
  ru: |                      # markdown-light, as in LT lessons
    …
tables:                      # rendered as real tables
  - caption: "Окончания"
    head: ["Склонение", "Окончание", "Примеры"]
    rows: [["I, твёрдая", "-о", "Олено, сестро"], …]
pairs:                       # «Типичная ошибка»
  - { wrong: "Іван, добрий день!", right: "Іване, добрий день!" }
examples:                    # 3–5
  - { text: "Пане професоре, можна запитати?", translation: "…", source: generated }
strict: false                # true for spelling blocks: one wrong letter = wrong (no «почти»)
exercises:                   # 20–40; append-only (ids are positions: uk-b-0410:x1 …)
  - { type: cloze,  text: "___, зайди до мене!", answer: "Іване", hint: "Іван", explain: "II скл., твёрдая → -е" }
  - { type: choice, text: "Я живу ___ Львові.", options: ["у", "в"], answer: 0, explain: "перед льв- пишем у" }
  - { type: fix,    text: "Дякую вас за допомогу.", answer: "Дякую вам за допомогу.", explain: "дякувати кому (Д.)" }
  - { type: spot,   text: "Ми приймали участь у конкурсі.", wrong: "приймали", answer: "брали", explain: "брати участь" }
  - { type: judge,  text: "Він вищий за мене.", correct: true, explain: "за / від / ніж — все три верны" }
  - { type: stress, word: "кропива", answer: 3, explain: "кропива́ (рус. крапи́ва)" }
```

Exercise types and what they train:
- `cloze`: type the form (declension, conjugation, vocative, numerals);
- `choice`: 2–4 options (euphony, -а/-у, який/котрий, prepositions);
- `fix`: correct the whole sentence (calques, government); the check normalises spaces, punctuation and apostrophes;
- `spot`: tap the wrong word, then type the right one (Russianisms in context);
- `judge`: right or wrong (fast volume for traps; a wrong «wrong» shows the fix);
- `stress`: tap the stressed vowel (Part 1, words stressed differently from Russian). No audio for now: the asset limit is near
  (PLAN «Inputs» 5).

Answer checking: the existing `checkAnswer`, plus Ukrainian normalisation: `'`, `’`, `ʼ` are the same; accent marks are
ignored; `strict` blocks don't accept one-letter typos. The mixed-script check in `build-content.ts` already catches Latin
`i` typed in place of Cyrillic `і`. Validation rules: 3–5 examples, 20–40 exercises, `spot.wrong` is a word of the sentence,
`choice.answer` is an index into `options`, `fix.answer` ≠ `text`, every exercise has `explain`.

## 6. Block map (draft, 95 blocks)

Parts become modules and subsections become blocks. Small subsections are merged, large ones split; each part ends with a review block.

| Part | Blocks |
|---|---|
| 1 Phonetics (6) | 0101 letters read differently (и, і, ї, е, є, г/ґ, щ) · 0102 vowels, no akanye, unstressed е/и · 0103 hard and soft consonants, hard ч, р · 0104 no devoicing, [ў], assimilation (-ться, -шся) · 0105 дж/дз, long consonants, apostrophe · 0106 stress (ви́-, words unlike Russian) |
| 2 Alternations (9) | 0201 о/е→і · 0202 е→о after sibilants, ять→і · 0203 vowel alternations in verbs · 0204 г/к/х→з/ц/с/ж/ч/ш, д→дж · 0205 cluster simplification · 0206 у/в · 0207 і/й, та · 0208 з/із/зі/зо, б/би, ж/же, -ся/-сь · 0209 euphony review |
| 3 Orthography (8) | 0301 ь · 0302 apostrophe · 0303 doubled consonants · 0304 prefixes з-/с-, роз-, пре-/при-/прі- · 0305 loanwords, «дев'ятка», проєкт · 0306 one word / hyphen / separate, пів · 0307 capitals, feminitives · 0308 Правопис 2019: what's new |
| 4 Noun (12) | 0401 cases, gender unlike Russian · 0402 I declension · 0403 II declension masc. groups · 0404 dative -ові/-у, locative -і/-у/-ові · 0405 genitive -а/-у ① (people, things, towns, units) · 0406 genitive -а/-у ② (abstract, institutions, pairs акта/акту) · 0407 II neuter · 0408 III declension · 0409 IV declension · 0410 vocative · 0411 surnames, indeclinable nouns · 0412 review |
| 5 Adjective (6) | 0501 hard and soft declension · 0502 possessive adjectives · 0503 short forms · 0504 comparison (най-, за/від/ніж) · 0505 -ськ-/-цьк-/-зьк- · 0506 review |
| 6 Numeral (6) | 0601 declension of cardinals · 0602 numeral + noun, півтора · 0603 collective numerals, обидва · 0604 ordinals and dates · 0605 time · 0606 review |
| 7 Pronoun (6) | 0701 personal pronouns, н- after prepositions · 0702 possessive, свій · 0703 demonstrative, який/котрий · 0704 indefinite and negative pronouns · 0705 весь/увесь, сам/самий · 0706 review |
| 8 Verb (13) | 0801 infinitive -ти · 0802 present tense I/II · 0803 irregular verbs, є · 0804 past tense · 0805 synthetic future · 0806 aspect, -ува- · 0807 imperative, ходімо, хай · 0808 conditional, якби/щоб · 0809 participles and calques · 0810 -но/-то forms · 0811 passive and -ся · 0812 gerunds (-вши) · 0813 review |
| 9 Function words (6) | 0901 adverbs, spelling · 0902 prepositions · 0903 Russian «по» → за/з/на/через · 0904 conjunctions (ніж, бо, якщо/якби) · 0905 particles (чи, хіба, -но, аж, -таки) · 0906 interjections + review |
| 10 Syntax (6) | 1001 verb government · 1002 government of nouns and adjectives, time in the genitive · 1003 agreement · 1004 impersonal sentences · 1005 complex sentences, word order · 1006 review |
| 11 Punctuation (4) | 1101 comma · 1102 dash and colon · 1103 direct speech, quotation marks · 1104 abbreviations, numbers, dates |
| 12 Russianisms (7) | 1201 set phrases ① · 1202 set phrases ② · 1203 single words ① · 1204 single words ② · 1205 pairs often confused · 1206 surzhyk, polite formulas · 1207 review |
| 13 Stylistics (6) | 1301 functional styles · 1302 business letter · 1303 connectors for arguments · 1304 synonyms instead of repeats · 1305 word formation, diminutives · 1306 idioms |

About **30 exercises per block → ~2,800 exercises**; review blocks draw from their part instead of having their own bank (plus ~15 new mixed ones).

## 7. Content quality («accuracy over volume»)

1. **Errata pass** over the PDF (§2) and a check of every rule against Правопис 2019 and goroh.pp.ua / slovnyk.ua before writing.
2. **Writing:** in Claude Code sessions, from the course + Правопис + standard grammar; recipe `prompts/content/uk-grammar.md`
   (Russian explanations, generated exercises; Tatoeba examples only where they are clean, see question 1).
3. **Automatic checks** (`scripts/uk-check.py`, cached in `.cache/`), run on every block before commit:
   - **LanguageTool (uk)**: every *correct* sentence (examples, answers, `fix.answer`, `judge: true`) must have 0 issues;
     every *wrong* sentence should get a flag (if it doesn't, a human checks it). Local LanguageTool server; the public
     API is fine too because the content isn't personal.
   - **VESUM** (`brown-uk/dict_uk`, the open morphological dictionary of Ukrainian): every word of every answer exists with the
     expected tag; this catches made-up forms. Check the licence and availability in phase 0.
4. **The learner reads** what the checks flag, plus a sample of 5 exercises per block. ⚠️ reports in the app go to `pnpm content:reports`.
5. Variant norms (радості/радости, міф/міт, сміятися з/над) are accepted as answers (`also`) and never counted as mistakes.

## 8. Phases

| Phase | What | Output | Size |
|---|---|---|---|
| 0 | Fact-check the PDF, final block map, check tools (LanguageTool, VESUM), content recipe | `UK-GRAMMAR-ERRATA.md`, `prompts/content/uk-grammar.md`, `scripts/uk-check.py` | 1 session |
| 1 | Engine: `uk.ts` + tests, build/validate, migration 0014, Worker API, Mini App map / block / session / mistakes, smoke 21; **pilot: 3 blocks** (0206 у/в, 0410 vocative, 1201 calques) to try all exercise types | PR `feat/uk-grammar` | 1–2 sessions |
| 2 | Diagnostic + review queue + part tests + cheat sheet | PR | 1 session |
| 3 | Content in waves of ~10–12 blocks (each wave on its own `content/uk-grammar-*` branch; commit after every block) | ~8 sessions | |
| 4 | Optional: AI check of free writing in Ukrainian (business letter, essay from 13.2–13.3) through the existing LLM router; statistics of «my typical mistakes» | | later |

**Wave order: the order of the PDF** (decided 2026-11-20): ① Parts 1–2 · ② 3 · ③ 4 · ④ 5–6 · ⑤ 7 · ⑥ 8 · ⑦ 9–10 ·
⑧ 11–13. The pilot blocks of phase 1 stay where they are in the map; they are there to try every exercise type.
Part 1 is text-only (no audio): `stress`, `choice` and `judge` exercises on spelling ↔ sound.

## 9. Decisions (made by the learner, 2026-11-20)

1. ✅ **Sentences are written, not taken from Tatoeba:** checked automatically (LanguageTool, VESUM) and read by the learner,
   because Tatoeba's Ukrainian sentences themselves contain Russianisms and surzhyk. This is an exception to the repo rule
   «examples only from Tatoeba», **for `content/uk/` only**; examples have `source: generated`.
2. ✅ **Fully separate:** UA answers count toward nothing in the existing flow (streak, `/stats`, weekly report, due counts).
   The section has its own counters.
3. ✅ **Content in the order of the PDF** (§8).
4. ✅ **Diagnostic first:** the map opens with «Пройти диагностику» until it's done or dismissed.
5. Personal copies: owner-only (default).
