# Recipe: Lithuanian foundation course (A0 → A2 exam) for colleagues' copies

Follow `prompts/content/_common.md` first, **with the differences below**. The plan is `docs/EXTENSION-PLAN.md` (§6 course,
§6.7 formats, §8.1 reserved ids). This material is for **other learners**, not the owner.

## Who reads it
Adults who are native **Russian** speakers, starting Lithuanian from zero, aiming at the A2 state language exam
(Basic–I category). They may **not** know Ukrainian or Belarusian.

## Differences from the common rules
1. **Russian only.** Explanations, comparisons, notes and translations are in Russian. **No Ukrainian or Belarusian
   comparisons** (this replaces rule 4 of `_common.md` for this course). Compare with Russian where it helps
   (*daryti → padaryti* ≈ *делать → сделать*), and say plainly where Lithuanian differs.
2. **Beginner style.** Short sentences, one point at a time, a small table only when it is the point of the lesson. The first
   time a grammar term appears, give both names (*vardininkas — именительный падеж*). Every Lithuanian form in an explanation
   is shown as it is used, with the stress mark when known (`content/lt/stress.yaml`).
3. **Only what the unit needs.** Each lesson belongs to one unit of the course map (EXTENSION-PLAN §6.4) and uses words from
   that unit or earlier units. Don't pull B1 grammar forward.
4. **Mark everything as foundation:** `track: foundation` on every new item, lesson, text, dialogue, task and mock exam.
   The owner's bot must never see it (EXTENSION-PLAN §4.2).
5. **Use only the reserved ids** (EXTENSION-PLAN §8.1): words/phrases `lt-w-6001…7999` / `lt-p-6001…7999`, lessons
   `lt-g-0201…0299`, texts `lt-r-0201…0299`, listening `lt-l-*`, writing tasks `lt-t-*`, speaking `lt-s-*`, mock exams `lt-x-*`.
6. **Existing A1–A2 words are reused**, not duplicated: the course map points to their ids. Allowed changes to them: stress
   marks, audio, fixing a wrong form. Never change their id, meaning text or order (they are in the owner's queue).
7. **Examples** in words, phrases and lessons: Tatoeba only, verbatim by id (rule 3 of `_common.md`). Prefer short
   present-tense sentences in A1 units. An empty id is fine when nothing good exists.
8. **Written texts** (reading, listening dialogues, tasks, mock exams) are `source: generated`, **original** and modelled on
   the exam's text types (ads, menus, tickets, notes, text messages, recipes, short biographies, announcements). Never copy
   NŠA sample tests or textbook material. Use only vocabulary and grammar of the unit and earlier units.
9. **Stress marks for every course word.** Run `pnpm content:stress` after adding words; add the rest by hand from lkz.lt /
   ekalba. A course word without stress fails course-map validation.
10. **Audio** for foundation content uses the licensed voice chosen in EXTENSION-PLAN §7.2, not edge-tts.
11. **Spanish and French files are never touched** on foundation branches (`scripts/ci/untouched.sh` fails the PR).

## Per unit, in this order
1. Words: map existing ids to the unit; check the unit topic against the official A2 word list for that topic; add gap words
   (`scripts/batches/lt-f-<first id>.py` → `batch-to-yaml.py`).
2. Phrases (6–8): Tatoeba sentences that a beginner can use as is.
3. Grammar lesson(s): 3–5 examples, 6–8 exercises; exercises use the unit's words.
4. Reading (2 texts of exam types), listening (3 dialogues), 1 writing task, 2 speaking situations, the can-do list.
5. `pnpm content:validate`, `pnpm test`, `pnpm smoke`; list everything you were unsure about for the owner to check.
6. Commit and push to the branch after every lesson, text or ~50 words. Never merge or push to `main`.
