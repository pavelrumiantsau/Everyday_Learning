import { z } from "zod";
import { principalFormsLine } from "./labels";
import { normalizeWord, wordsOf } from "./reading";

export const LANGS = ["lt", "es", "fr"] as const;
export type Lang = (typeof LANGS)[number];

/** Explanation language per target language (PLAN §6.1). */
export const EXPLANATION_LANG = { lt: "ru", es: "en", fr: "en" } as const satisfies Record<Lang, "ru" | "en">;

const Example = z.object({
  text: z.string().min(1),
  translation: z.string().min(1),
  source: z.string().regex(/^(tatoeba:\d+|generated)$/, "use tatoeba:<id> or generated"),
});

/** Parts of speech used by items (and by word lookups in reading mode). */
export const POS = ["noun", "verb", "adj", "adv", "pron", "prep", "conj", "num", "part", "phrase"] as const;

const Localized = z.object({ ru: z.string().min(1).optional(), en: z.string().min(1).optional() });

export const Item = z
  .object({
    id: z.string().regex(/^(lt|es|fr)-(w|p)-\d{4}$/, "id must look like lt-w-0001 or es-p-0001"),
    type: z.enum(["word", "phrase"]),
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    text: z.string().min(1),
    stress: z.string().min(1).optional(),
    pos: z.enum(POS).optional(),
    gender: z.enum(["m", "f", "n", "mf"]).optional(),
    /** Lithuanian verbs: the other two principal forms — present and past, 3rd person (priimti → priima, priėmė). */
    forms: z.object({ pres: z.string().min(1), past: z.string().min(1) }).optional(),
    /** Lithuanian nouns: genitive singular, as in dictionaries (priežastis → priežasties); genitive plural for plural-only nouns. */
    gen: z.string().min(1).optional(),
    /** Plural-only noun (santykiai, duomenys): `gen` is then the genitive plural. */
    plural_only: z.boolean().optional(),
    meaning: Localized,
    note: Localized.optional(),
    examples: z.array(Example).default([]),
    tags: z.array(z.string()).default([]),
  })
  .superRefine((item, ctx) => {
    const lang = item.id.slice(0, 2) as Lang;
    const expl = EXPLANATION_LANG[lang];
    if (!item.meaning[expl]) {
      ctx.addIssue({ code: "custom", path: ["meaning", expl], message: `${lang} items need meaning.${expl}` });
    }
    if (item.note && !item.note[expl]) {
      ctx.addIssue({ code: "custom", path: ["note", expl], message: `${lang} notes must be in ${expl}` });
    }
    if (lang === "lt" && item.pos === "verb" && !item.forms) {
      ctx.addIssue({ code: "custom", path: ["forms"], message: "Lithuanian verbs need forms: { pres, past } (3rd person)" });
    }
    if (lang === "lt" && item.pos === "noun" && !item.gen) {
      ctx.addIssue({ code: "custom", path: ["gen"], message: "Lithuanian nouns need gen (genitive, as in dictionaries)" });
    }
    if ((item.id[3] === "w") !== (item.type === "word")) {
      ctx.addIssue({ code: "custom", path: ["id"], message: "id letter must match type (w = word, p = phrase)" });
    }
  });
export type Item = z.infer<typeof Item>;

export const ItemFile = z.array(Item);

// Grammar lessons: content/<lang>/grammar/<nnnn>-<slug>.yaml, one lesson per file (PLAN §6.5).
const ClozeExercise = z
  .object({
    type: z.literal("cloze"),
    /** Sentence with exactly one blank: "Vaikystėje aš dažnai ___ kaime." */
    text: z.string().min(1),
    /** Expected answer for the blank. */
    answer: z.string().trim().min(1, "exercise answer must not be empty"),
    /** Other answers that are also right (word order variants, synonyms). */
    also: z.array(z.string().trim().min(1)).optional(),
    /** Shown next to the blank, usually the base form: "būti". */
    hint: z.string().min(1).optional(),
    /** Translation of the whole sentence into the explanation language. */
    translation: z.string().min(1),
  })
  .superRefine((ex, ctx) => {
    if (ex.text.split("___").length !== 2) ctx.addIssue({ code: "custom", path: ["text"], message: "cloze text needs exactly one ___" });
  });

export const Exercise = z.discriminatedUnion("type", [ClozeExercise]);
export type Exercise = z.infer<typeof Exercise>;

export const Lesson = z
  .object({
    id: z.string().regex(/^(lt|es|fr)-g-\d{4}$/, "id must look like lt-g-0001"),
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    /** Position in the language's sequence; lessons come in this order. */
    order: z.number().int().positive(),
    /** In the explanation language (RU for Lithuanian, EN for Spanish/French). */
    title: z.string().min(1),
    /** A few short paragraphs; markdown-light: **bold**, *italic*, "- " lists, blank line = new paragraph. */
    explanation: Localized,
    /** Comparison with Russian/Ukrainian (LT) or English (ES/FR), only where it helps. */
    comparison: Localized.optional(),
    examples: z.array(Example).min(3).max(5),
    exercises: z.array(Exercise).min(4).max(8),
  })
  .superRefine((lesson, ctx) => {
    const lang = lesson.id.slice(0, 2) as Lang;
    const expl = EXPLANATION_LANG[lang];
    if (!lesson.explanation[expl]) {
      ctx.addIssue({ code: "custom", path: ["explanation", expl], message: `${lang} lessons need explanation.${expl}` });
    }
    if (lesson.comparison && !lesson.comparison[expl]) {
      ctx.addIssue({ code: "custom", path: ["comparison", expl], message: `${lang} comparisons must be in ${expl}` });
    }
  });
export type Lesson = z.infer<typeof Lesson>;

// Reading texts: content/<lang>/reading/<nnnn>-<slug>.yaml, one text per file (PLAN §6.6).
const GlossaryEntry = z.object({
  /** The word as written in the text (any case); tapping it shows this entry instead of asking the AI. */
  word: z.string().trim().min(1),
  /** Dictionary form. */
  lemma: z.string().trim().min(1),
  /** In the explanation language: Russian for Lithuanian, English for Spanish/French. */
  meaning: z.string().trim().min(1),
  pos: z.enum(POS).optional(),
  gender: z.enum(["m", "f", "n", "mf"]).optional(),
  /** Lithuanian verbs: present and past, 3rd person. */
  forms: z.object({ pres: z.string().min(1), past: z.string().min(1) }).optional(),
  /** Lithuanian nouns: genitive singular. */
  gen: z.string().min(1).optional(),
  /** Short note on the form in the text, e.g. "прош. вр., мы". */
  note: z.string().min(1).optional(),
  /** The vocabulary item for this lemma (content/<lang>/vocab), if there is one. */
  item: z.string().regex(/^(lt|es|fr)-(w|p)-\d{4}$/).optional(),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

const Question = z
  .object({
    q: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(4),
    /** 0-based index of the right option. */
    answer: z.number().int().min(0),
  })
  .superRefine((q, ctx) => {
    if (q.answer >= q.options.length) ctx.addIssue({ code: "custom", path: ["answer"], message: "answer must be an index into options" });
    if (new Set(q.options).size !== q.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "options must differ" });
  });

/** Words per text by level (PLAN §6.6). */
export const READING_WORDS: Record<"A1" | "A2" | "B1" | "B2" | "C1", [number, number]> = {
  A1: [60, 150],
  A2: [60, 150],
  B1: [120, 250],
  B2: [120, 350],
  C1: [120, 400],
};

const CYRILLIC = /[а-яё]/i;

export const ReadingText = z
  .object({
    id: z.string().regex(/^(lt|es|fr)-r-\d{4}$/, "id must look like lt-r-0001"),
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    /** In the target language. */
    title: z.string().trim().min(1),
    /** Short topic in the explanation language ("переезд", "a day in the city"). */
    topic: z.string().trim().min(1),
    /** Paragraphs separated by a blank line. */
    text: z.string().trim().min(1),
    glossary: z.array(GlossaryEntry).default([]),
    /** Exactly 3 multiple-choice comprehension questions, in the target language. */
    questions: z.array(Question).length(3),
    /** "generated" when written with an LLM, otherwise a URL of the (adapted) original. */
    source: z.string().regex(/^(generated|https?:\/\/\S+)$/, "use generated or a URL"),
  })
  .superRefine((t, ctx) => {
    const lang = t.id.slice(0, 2) as Lang;
    const words = wordsOf(t.text);
    const [min, max] = READING_WORDS[t.cefr];
    if (words.length < min || words.length > max) {
      ctx.addIssue({ code: "custom", path: ["text"], message: `${t.cefr} texts need ${min}–${max} words (has ${words.length})` });
    }
    const inText = new Set(words.map(normalizeWord));
    const seen = new Set<string>();
    t.glossary.forEach((g, i) => {
      const key = normalizeWord(g.word);
      if (!inText.has(key)) ctx.addIssue({ code: "custom", path: ["glossary", i, "word"], message: `"${g.word}" is not a word of the text` });
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["glossary", i, "word"], message: `"${g.word}" is in the glossary twice` });
      seen.add(key);
      if (EXPLANATION_LANG[lang] === "ru" && !CYRILLIC.test(g.meaning)) {
        ctx.addIssue({ code: "custom", path: ["glossary", i, "meaning"], message: `${lang} glossary meanings must be in Russian` });
      }
      if (EXPLANATION_LANG[lang] === "en" && CYRILLIC.test(g.meaning)) {
        ctx.addIssue({ code: "custom", path: ["glossary", i, "meaning"], message: `${lang} glossary meanings must be in English` });
      }
      if (g.item && !g.item.startsWith(`${lang}-`)) {
        ctx.addIssue({ code: "custom", path: ["glossary", i, "item"], message: `item ${g.item} is not a ${lang} item` });
      }
    });
  });
export type ReadingText = z.infer<typeof ReadingText>;

export const Schedule = z.object({
  timezone: z.string().min(1),
  morning: z.string().regex(/^\d{2}:\d{2}$/),
  evening: z.string().regex(/^\d{2}:\d{2}$/),
  new_per_day: z.record(z.enum(LANGS), z.number().int().min(0).max(30)),
  max_new_polls: z.number().int().min(0).max(20),
  max_review_polls: z.number().int().min(0).max(20),
  /** Answers needed for a day to count towards the streak. */
  min_day_answers: z.number().int().min(1).max(200),
  /** Reverse cards (meaning → word) per language, added once the meaning card is known. */
  reverse: z.record(z.enum(LANGS), z.boolean()),
});
export type Schedule = z.infer<typeof Schedule>;

/** What the learner can change at runtime (stored in D1); anything missing falls back to config/schedule.yaml. */
export const Prefs = Schedule.omit({ timezone: true })
  .partial()
  .extend({
    // Any subset of languages (z.record with enum keys would require all of them).
    new_per_day: z.partialRecord(z.enum(LANGS), z.number().int().min(0).max(30)).optional(),
    reverse: z.partialRecord(z.enum(LANGS), z.boolean()).optional(),
  });
export type Prefs = z.infer<typeof Prefs>;

export function langOf(item: Pick<Item, "id">): Lang {
  return item.id.slice(0, 2) as Lang;
}

/** Dictionary form: "priimti, priima, priėmė" for verbs, "priežastis, priežasties" for nouns, otherwise the plain text. */
export function principalForms(item: Pick<Item, "text" | "stress" | "forms" | "gen">): string {
  return principalFormsLine(item);
}

export function meaningOf(item: Item): string {
  return item.meaning[EXPLANATION_LANG[langOf(item)]]!;
}

const CanDo = z.array(z.string().min(3).max(100)).max(10);
export const Milestones = z.object({
  quarters: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      lt: CanDo.optional(),
      es: CanDo.optional(),
      fr: CanDo.optional(),
    }),
  ),
});
export type Milestones = z.infer<typeof Milestones>;

/** Suggested listening/reading outside the app (config/sources.yaml, PLAN §11): shown in the 🎧 screen and the Sunday report. */
export const Sources = z.object({
  sources: z
    .array(
      z.object({
        lang: z.enum(["lt", "es", "fr"]),
        title: z.string().min(2).max(80),
        url: z.string().url().startsWith("https://"),
        type: z.enum(["podcast", "radio", "video", "reading"]),
        level: z.string().regex(/^(A1|A2|B1|B2|C1)(–(A2|B1|B2|C1|C2))?$/),
        note: z.string().min(3).max(160),
      }),
    )
    .min(1),
});
export type Sources = z.infer<typeof Sources>;
export type Source = Sources["sources"][number];
