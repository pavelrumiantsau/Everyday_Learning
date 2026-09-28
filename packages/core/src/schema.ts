import { z } from "zod";

export const LANGS = ["lt", "es", "fr"] as const;
export type Lang = (typeof LANGS)[number];

/** Explanation language per target language (PLAN §6.1). */
export const EXPLANATION_LANG = { lt: "ru", es: "en", fr: "en" } as const satisfies Record<Lang, "ru" | "en">;

const Example = z.object({
  text: z.string().min(1),
  translation: z.string().min(1),
  source: z.string().regex(/^(tatoeba:\d+|generated)$/, "use tatoeba:<id> or generated"),
});

const Localized = z.object({ ru: z.string().min(1).optional(), en: z.string().min(1).optional() });

export const Item = z
  .object({
    id: z.string().regex(/^(lt|es|fr)-(w|p)-\d{4}$/, "id must look like lt-w-0001 or es-p-0001"),
    type: z.enum(["word", "phrase"]),
    cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    text: z.string().min(1),
    stress: z.string().min(1).optional(),
    pos: z.enum(["noun", "verb", "adj", "adv", "pron", "prep", "conj", "num", "part", "phrase"]).optional(),
    gender: z.enum(["m", "f", "n", "mf"]).optional(),
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
    if ((item.id[3] === "w") !== (item.type === "word")) {
      ctx.addIssue({ code: "custom", path: ["id"], message: "id letter must match type (w = word, p = phrase)" });
    }
  });
export type Item = z.infer<typeof Item>;

export const ItemFile = z.array(Item);

export const Schedule = z.object({
  timezone: z.string().min(1),
  morning: z.string().regex(/^\d{2}:\d{2}$/),
  evening: z.string().regex(/^\d{2}:\d{2}$/),
  new_per_day: z.record(z.enum(LANGS), z.number().int().min(0).max(30)),
  max_review_polls: z.number().int().min(0).max(20),
});
export type Schedule = z.infer<typeof Schedule>;

export function langOf(item: Pick<Item, "id">): Lang {
  return item.id.slice(0, 2) as Lang;
}

export function meaningOf(item: Item): string {
  return item.meaning[EXPLANATION_LANG[langOf(item)]]!;
}
