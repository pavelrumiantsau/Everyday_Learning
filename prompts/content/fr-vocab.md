# Recipe: next French vocabulary batch (~150 items, A1–A2)

Follow `prompts/content/_common.md` first.

1. Find where the last batch stopped (`scripts/batches/fr-*.py`, `content/fr/vocab/*.yaml`, highest id) and continue with the next
   frequency ranks (`pnpm content:candidates fr <from> 1500`). The frequency list is from subtitles: also check a topic list
   (months, food, clothes, colours, transport, shopping, weather) for basic words it ranks low.
2. Pick lemmas (the candidates are word forms), skip names, swear words and crime vocabulary. Explanations and notes in **English**;
   give **gender for every noun**, irregular forms in notes (je vais, nous allons…), false friends (rester, demander), and short
   `ES:` comparisons where Spanish helps or misleads (avoir 20 ans = tener 20 años; FR has one "to be").
3. Examples only from Tatoeba `fra` (`python3 scripts/tatoeba.py fr --words …` or a regex) — read every pair; avoid the literary
   passé simple (il partit, elle appela) and sentences with typos.
4. Write `scripts/batches/fr-<cefr>-<first id>.py` in the format of `scripts/batches/fr-a1-0001.py`, then
   `python3 scripts/batch-to-yaml.py scripts/batches/<file>.py fr <first id> content/fr/vocab/<cefr>-<first id>.yaml`.
5. Continue with steps 8–10 of the common rules (no `pnpm content:audio` while audio is paused — PLAN "Inputs…" 5).
