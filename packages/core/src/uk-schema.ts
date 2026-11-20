// Ukrainian grammar blocks: content/uk/blocks/<part>/<id>-<slug>.yaml, one block per file (docs/UK-GRAMMAR-PLAN.md §5).
// Kept apart from `Lesson`: Ukrainian is not one of LANGS, so the original plan, rotation and reviews never see it.
import { z } from "zod";
import { BLANK } from "./grammar";
import { RUSSIAN_ONLY, tokens, UK_PARTS, vowelPositions } from "./uk";

const Uk = z.string().trim().min(1);
/** In a correct Ukrainian answer: no ы, э, ъ, ё. */
const UkRight = Uk.refine((s) => !RUSSIAN_ONLY.test(s), "a Ukrainian answer must not contain ы, э, ъ or ё");
/** One line on why, in Russian; shown after every answer. */
const Explain = z.string().trim().min(3);

const Cloze = z
  .object({ type: z.literal("cloze"), text: UkRight, answer: UkRight, also: z.array(UkRight).optional(), hint: Uk.optional(), explain: Explain })
  .refine((e) => e.text.split(BLANK).length === 2, { path: ["text"], message: "cloze text needs exactly one ___" });

const Choice = z
  .object({ type: z.literal("choice"), text: UkRight, options: z.array(UkRight).min(2).max(4), answer: z.number().int().min(0), explain: Explain })
  .refine((e) => e.answer < e.options.length, { path: ["answer"], message: "answer must be an index into options" })
  .refine((e) => new Set(e.options).size === e.options.length, { path: ["options"], message: "options must differ" });

/** A sentence with a mistake; the learner writes it correctly. */
const Fix = z
  .object({ type: z.literal("fix"), text: Uk, answer: UkRight, also: z.array(UkRight).optional(), explain: Explain })
  .refine((e) => e.text !== e.answer, { path: ["answer"], message: "fix answer must differ from the text" });

/** A sentence with one wrong word: tap it, then type the right one. */
const Spot = z
  .object({ type: z.literal("spot"), text: Uk, wrong: Uk, answer: UkRight, also: z.array(UkRight).optional(), explain: Explain })
  .refine((e) => tokens(e.text).filter((t) => t.word === e.wrong).length === 1, { path: ["wrong"], message: "wrong must be exactly one word of the text" })
  .refine((e) => e.wrong !== e.answer, { path: ["answer"], message: "answer must differ from the wrong word" });

/** Right or wrong? A wrong sentence carries its corrected form. */
const Judge = z
  .object({ type: z.literal("judge"), text: Uk, correct: z.boolean(), fix: UkRight.optional(), explain: Explain })
  .refine((e) => e.correct === !e.fix, { path: ["fix"], message: "a wrong sentence needs fix, a right one none" })
  .refine((e) => !e.correct || !RUSSIAN_ONLY.test(e.text), { path: ["text"], message: "a correct sentence must not contain ы, э, ъ or ё" });

/** Tap the stressed vowel; `answer` = its number among the word's vowels (1-based). */
const Stress = z
  .object({ type: z.literal("stress"), word: UkRight, answer: z.number().int().min(1), explain: Explain })
  .refine((e) => !/́/.test(e.word.normalize("NFD")), { path: ["word"], message: "the word must not show its stress" })
  .refine((e) => e.answer <= vowelPositions(e.word).length, { path: ["answer"], message: "answer is past the word's last vowel" })
  .refine((e) => vowelPositions(e.word).length >= 2, { path: ["word"], message: "a one-vowel word has nothing to choose" });

export const UkExercise = z.discriminatedUnion("type", [Cloze, Choice, Fix, Spot, Judge, Stress]);
export type UkExercise = z.infer<typeof UkExercise>;

const Table = z.object({
  caption: z.string().trim().min(1).optional(),
  head: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string())).min(1),
});

export const UkBlock = z
  .object({
    id: z.string().regex(/^uk-b-\d{4}$/, "id must look like uk-b-0410"),
    part: z.number().int().min(1).max(UK_PARTS.length),
    /** Position within the part. */
    order: z.number().int().positive(),
    /** Russian, with the Ukrainian term where it helps. */
    title: z.string().trim().min(1).max(80),
    /** Section(s) of the course PDF: "§4.10". */
    source: z.string().regex(/^§\d+(\.\d+)?([–,] ?(§)?\d+(\.\d+)?)*$/, "source looks like §4.10 or §2.6–2.8"),
    level: z.enum(["B1", "B2", "C1"]),
    /** Russian explanation, markdown-light (as LT lessons). */
    rule: z.string().trim().min(20),
    tables: z.array(Table).default([]),
    /** «Типичная ошибка» pairs. */
    pairs: z.array(z.object({ wrong: Uk, right: UkRight })).default([]),
    examples: z.array(z.object({ text: UkRight, note: z.string().trim().min(1).optional() })).min(3).max(5),
    /** Spelling blocks: the check is strict anyway; kept for the UI («буква важна»). */
    strict: z.boolean().default(false),
    exercises: z.array(UkExercise).min(20).max(40),
  })
  .superRefine((b, ctx) => {
    if (Number(b.id.slice(5, 7)) !== b.part) ctx.addIssue({ code: "custom", path: ["part"], message: `${b.id} belongs to part ${Number(b.id.slice(5, 7))}` });
    if (Number(b.id.slice(7, 9)) !== b.order) ctx.addIssue({ code: "custom", path: ["order"], message: `${b.id} has order ${Number(b.id.slice(7, 9))}` });
    b.tables.forEach((t, i) => {
      t.rows.forEach((r, j) => {
        if (r.length !== t.head.length) ctx.addIssue({ code: "custom", path: ["tables", i, "rows", j], message: `row has ${r.length} cells, head ${t.head.length}` });
      });
    });
    const seen = new Set<string>();
    b.exercises.forEach((e, i) => {
      const key = `${e.type}:${"text" in e ? e.text : e.word}`;
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["exercises", i], message: "the same exercise twice" });
      seen.add(key);
    });
  });
export type UkBlock = z.infer<typeof UkBlock>;
