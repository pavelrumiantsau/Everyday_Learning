// FROZEN copy of packages/core/src/planner.ts at f413d69 (2026-10-08) — the owner's behaviour before the colleagues extension.
// Do not edit: test/legacy-baseline.test.ts compares the live code (legacy profile) against it. See docs/EXTENSION-PLAN.md §4.
import { LANGS, langOf, type Item, type Lang } from "../../src/schema";

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
