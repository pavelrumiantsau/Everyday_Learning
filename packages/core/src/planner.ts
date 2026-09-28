import { LANGS, langOf, type Item, type Lang } from "./schema";

/** Next unseen items per language, in file order (files are sorted by frequency/priority). */
export function pickNewItems(
  items: readonly Item[],
  introduced: ReadonlySet<string>,
  perLang: Partial<Record<Lang, number>>,
): Item[] {
  return LANGS.flatMap((lang) =>
    items.filter((i) => langOf(i) === lang && !introduced.has(i.id)).slice(0, perLang[lang] ?? 0),
  );
}
