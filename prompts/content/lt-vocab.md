# Recipe: next Lithuanian vocabulary batch (~120 words, B1–B2)

Follow `prompts/content/_common.md` first.

1. Find where the last batch stopped: look at `scripts/batches/lt-*.py` and `content/lt/vocab/*.yaml` (highest id and the
   frequency ranks mentioned in the previous batch's header or PLAN §6.3). Continue with the next frequency ranks
   (e.g. `pnpm content:candidates lt 4000 2500`), so batches don't overlap.
2. From the candidates, pick ~120 useful words for an adult B1→B2 learner: everyday life, work, society, news, opinions,
   abstract nouns, verbs with prefixes, connectors. Mix roughly 45% nouns, 35% verbs, 20% adjectives/adverbs/phrases.
   Prefer words that fit the current quarter's grammar topics in PLAN §3.4.
3. Write `scripts/batches/lt-<cefr>-<first id>.py` in the same format as `scripts/batches/lt-b1-0017.py`
   (kind|text|pos|gender|cefr|meaning_ru|tatoeba_id|note_ru|forms-or-genitive, plus `PLURAL_ONLY`).
   Order rows so nouns, verbs and adjectives alternate (lessons take words in file order).
4. `python3 scripts/batch-to-yaml.py scripts/batches/<file>.py lt <first id> content/lt/vocab/<cefr>-<first id>.yaml`
   where `<first id>` = highest existing Lithuanian item number + 1.
5. Check the YAML by eye: meanings, genders, verb forms, genitives. Fix in the `.py` file and regenerate.
6. Continue with steps 8–10 of the common rules.
