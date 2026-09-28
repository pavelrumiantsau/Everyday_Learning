# Everyday Learning — guide for Claude Code sessions

A personal language-learning system for **one learner**: a Telegram bot + Telegram Mini App on a Cloudflare Worker.
Native Russian/Ukrainian/Belarusian speaker, fluent English. **Lithuanian ≈ B1 is the priority (target B2 by autumn 2027)**,
Spanish beginner, French starts April 2027.

**Start here:** `docs/PLAN.md` → "Status" (what is done, what is left, content supply and next ids). Setup and secrets:
`docs/SETUP.md`. Everything else follows from those two files.

## Conventions that matter
- **Explanation language:** Lithuanian → **Russian**; Spanish/French → **English**. **Bot and Mini App UI strings: Russian.**
- **Accuracy over volume** for all learning content. Every form, translation and rule is learned as correct by a real person.
- Examples in vocabulary and grammar come **only from Tatoeba**, copied verbatim by sentence id (`scripts/batch-to-yaml.py` does this
  for vocabulary). Reading texts are written (`source: generated`) and checked line by line.
- Lithuanian verbs need `forms: {pres, past}` (3rd person), Lithuanian nouns need `gen` (plural-only nouns: genitive plural +
  `plural_only`). `pnpm content:validate` enforces this, plus duplicate words, glossary↔item links and lesson limits
  (≤ 5 examples, ≤ 8 exercises).
- Content rules in detail: `prompts/content/_common.md`, recipes `prompts/content/lt-vocab.md`, `es-vocab.md`; formats in PLAN §6.4–§6.6.

## Repository map
- `packages/core` — zod schemas (items, lessons, reading texts, schedule, prefs, milestones), FSRS, quiz, streaks, weekly logic,
  grammar rotation, reading tokenizer, labels, audio text builder. Unit tests in `packages/core/test`.
- `packages/llm` — provider router (Groq main, Gemini fallback, Anthropic off), adapters, prompts rendering; tests in `packages/llm/test`.
- `apps/worker` — Cloudflare Worker (Hono + D1). **Features plug in** via `src/features/<name>.ts` (`Feature`: commands, onMessage,
  onPollAnswer, api, onTick) and one line in `src/features/index.ts` (**`tutor` must stay last**: it takes plain text). Migrations in
  `migrations/` (next: **0010**). Settings at runtime: `src/prefs.ts` (config/schedule.yaml defaults + D1 overrides).
- `apps/miniapp` — React 19 + Vite. Features in `src/features/*.tsx` (`HomeEntry` + `Screen`), listed in `src/features.tsx`;
  review screen `src/screens/Review.tsx` (card kinds: recog, forms, prod, cloze, fix). Telegram theme CSS variables in `styles.css`.
- `content/<lang>/{vocab,phrasebook,grammar,reading}/*.yaml`, `config/*.yaml` (schedule, llm, milestones, sources), `prompts/**`.
- `scripts/` — content build/validate, sources, candidates, batches (`scripts/batches/*.py`), audio (`tts.py`), smoke test
  (`scripts/smoke.ts` + `scripts/smoke/NN-*.ts`, next: **13**), setup scripts.

## Commands
```bash
pnpm install
pnpm build            # content + LLM config → apps/worker/src/generated, Mini App → dist
pnpm typecheck
pnpm test             # unit tests (vitest)
pnpm smoke            # real Worker + local D1 + fake Telegram + fake LLM, ~1 min — run before every push
pnpm content:validate
pnpm content:sources  # download frequency lists + Tatoeba into .cache/ (once)
pnpm content:candidates lt <fromRank> <count>
python3 scripts/batch-to-yaml.py scripts/batches/<file>.py <lang> <firstId> content/<lang>/vocab/<file>.yaml
pnpm content:audio    # needs .cache/venv with edge-tts (docs/SETUP.md "Audio"); run AFTER merging content
pnpm content:reports  # open "report a mistake" entries from the live DB
pnpm llm:eval         # compare AI models on learner mistakes (real API calls, keys from apps/worker/.dev.vars)
pnpm setup:telegram   # re-run after adding/changing bot commands (updates the command menu)
```

## Deploying
- **Push to `main` = deploy** (CI: validate, typecheck, unit tests, smoke → D1 migrations → `wrangler deploy`). The learner prefers
  pushing directly to `main`. Nightly D1 backup goes to the private repo `pavelrumiantsau/Everyday_Learning-data`.
- The repo and its Actions logs are **public**: never log or commit personal texts, tokens or `.dev.vars`. Don't run anything that
  sends the learner's practice texts through GitHub Actions.
- Git author `Pavel Rumiantsau <p.rumiantsau@gmail.com>`; commit messages end with the co-author line from the session instructions.

## Working with sub-agents (lessons learned)
- **Run at most 1–2 agents in parallel.** Five at once hit the session usage limit together and lost unsaved work.
- Give each agent its own worktree, branch and **reserved id range / migration number / smoke file number**; tell it to
  **commit and push after every lesson, text or ~50 words**, never touch `main`, never deploy, never `git add` anything in `.claude/`.
- Parallel vocabulary batches overlap a lot (69 duplicate words once): after merging, drop duplicates in lesson order and regenerate
  YAML with `batch-to-yaml.py` (ids of later batches shift — fine as long as they haven't been deployed).
- Always review what agents flag as uncertain, and read Lithuanian texts/lessons yourself before merging.
- Agent worktrees live in `.claude/worktrees/` (git-ignored).
