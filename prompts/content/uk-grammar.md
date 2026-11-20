# Recipe: Ukrainian grammar blocks (content/uk/blocks)

Plan and decisions: `docs/UK-GRAMMAR-PLAN.md`; corrections to the course PDF: `docs/UK-GRAMMAR-ERRATA.md`.
Format: `packages/core/src/uk-schema.ts` → `UkBlock`; look at the pilot blocks (`uk-b-0106`, `0206`, `0410`, `1201`).

## Who it is for
A native Russian/Belarusian speaker who already speaks Ukrainian and wants to remove Russian interference up to C1.
Exercises target **contrast and typical mistakes**, not first exposure.

## Rules
- One block per file: `content/uk/blocks/<PP>/uk-b-<PPNN>-<slug>.yaml` (`PP` = part 01–13, `NN` = number in the part, as in
  the block map in the plan §6). Order of work: the order of the PDF (decided 2026-11-20).
- **Explanations, titles, `explain`: Russian.** Ukrainian terms in brackets where useful (*кличний відмінок*).
  Comparisons with Russian, Belarusian and Lithuanian are welcome where they help (the learner knows all three).
- **All Ukrainian sentences are written** (`source: generated` implied): Tatoeba's Ukrainian contains Russianisms, so it is
  not used here (exception to the repo rule, for `content/uk/` only). Norm: Український правопис 2019 + dictionaries.
- Before writing a block, read its PDF section **and** the errata; check every doubtful form in goroh.pp.ua / slovnyk.ua.
  Don't use a form you can't confirm. Variant norms (радості/радости, міф/міт) go into `also`, never count as mistakes.
- 3–5 examples, a table where the PDF has one, `pairs` for «Типичная ошибка», **20–40 exercises** (aim for ~30).
- Mix exercise types: `choice` (2–4 options), `cloze` (one `___`, `hint` = base form), `fix` (whole sentence with a mistake →
  correct sentence), `spot` (one wrong word: `wrong` must occur once as a word), `judge` (right or wrong; a wrong one has
  `fix`), `stress` (word without accent, `answer` = number of the stressed vowel, 1-based; й is not a vowel).
- Every exercise has `explain`: one short line on *why*, shown after the answer.
- Exercises are **append-only** once deployed (ids are positions: `uk-b-0410:x3`); fix a wrong one in place, don't reorder.
- Correct Ukrainian fields must not contain ы, э, ъ, ё (the schema rejects them); watch for Latin `i` instead of `і`
  (`content:validate` catches mixed scripts).
- Avoid constructions whose norm is disputed unless the block is about exactly that.

## Checks (all must pass before commit)
1. `pnpm content:validate` (schema, ids, folders).
2. `python3 scripts/uk-check.py content/uk/blocks/<PP>/<file>.yaml`: LanguageTool. **No "✗"** (a right sentence flagged)
   — fix the content or, if LanguageTool is wrong, double-check in a dictionary and note it in the PR. The "?" lines are
   intentionally wrong sentences LanguageTool can't see (euphony, vocative, stress): read each one yourself.
3. `pnpm test`, `pnpm smoke` before pushing.
4. List anything uncertain in the PR description for the learner to read.

Commit after every block (`git add` only the block's file).
