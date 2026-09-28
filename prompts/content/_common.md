# Rules for every content batch (read before any batch recipe)

You are preparing learning material for one real learner: native Russian/Ukrainian/Belarusian speaker, fluent English.
Lithuanian ≈ B1 (top priority, target B2 by autumn 2027), Spanish beginner, French from April 2027.
**Accuracy beats volume.** A wrong form or translation teaches a mistake that is hard to unlearn. When unsure, leave the word out.

1. Read `docs/PLAN.md` (Status table, §3 learning plan, §6 content) and `README.md` first.
2. Data: run `pnpm content:sources` (idempotent) to get frequency lists and Tatoeba exports into `.cache/sources/`.
3. **Example sentences come only from Tatoeba** — never write your own examples. `scripts/batch-to-yaml.py` copies the
   sentence and its translation verbatim by Tatoeba id. Choose short, natural, grammatically correct sentences;
   skip sentences with typos, odd translations, or grammar errors (e.g. accusative after negation in Lithuanian — it must be genitive).
4. Explanation language: Lithuanian → **Russian** (Ukrainian comparisons where closer); Spanish/French → **English**.
5. Skip: names, brands, swear words, film-plot vocabulary (guns, killing, police drama), words the learner already has
   (`grep` the `content/<lang>` folder), and forms that are not dictionary forms. Use the dictionary form as `text`.
6. Lithuanian verbs need `forms` (present and past 3rd person, e.g. `priima, priėmė`); Lithuanian nouns need the genitive
   singular (plural-only nouns: genitive plural and list them in `PLURAL_ONLY`). Double-check every irregular form.
7. Notes are optional and short; add one only when it helps (case government that differs from Russian, false friends,
   irregular forms, register). Never invent facts; if a note would need checking you can't do, skip it.
8. After writing the batch: `pnpm content:validate` must pass; run `pnpm content:audio` (needs `.cache/venv` with edge-tts,
   see docs/SETUP.md "Audio"); then `pnpm test` and `pnpm smoke`.
9. Update the **Content** table in `docs/PLAN.md` (counts) — nothing else in the docs.
10. Write a short summary for the pull request to `.cache/batch-summary.md`: what was added (count, id range, CEFR mix),
    10 sample items, and **a list of anything you were unsure about** for the learner to check. Do not commit or push:
    the workflow does that.
