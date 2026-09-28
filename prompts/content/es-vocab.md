# Recipe: next Spanish vocabulary batch (~60 items, A1–A2)

Follow `prompts/content/_common.md` first.

1. Find where the last batch stopped (`scripts/batches/es-*.py`, `content/es/**/*.yaml`, highest id) and continue with the next
   frequency ranks (`pnpm content:candidates es <from> 600`).
2. Pick ~60 items for a beginner: high-frequency verbs, everyday nouns, time/place words, useful phrases
   (phrases use kind `p` and pos `phrase`). Explanations and notes in **English**; point out cognates and false friends,
   irregular present forms (1st person) in notes, and gender surprises (el problema, la mano).
3. Write `scripts/batches/es-<cefr>-<first id>.py` in the format of `scripts/batches/es-a1-0011.py`, then
   `python3 scripts/batch-to-yaml.py scripts/batches/<file>.py es <first id> content/es/vocab/<cefr>-<first id>.yaml`.
4. Continue with steps 8–10 of the common rules.
