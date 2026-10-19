import { readFileSync } from "node:fs";
import type { Smoke } from "./context.ts";

// «Мои слова» (docs/PLAN.md "Real-use fixes", 2026-10-19), on the owner's Worker after the other checks: every card's word
// is listed with its meaning, words added from reading are marked, and — the owner is B1+ — no Lithuanian A1–A2 word came
// as a new card (the morning lesson, «Ещё новые слова» and placement all pick from `learnerItems()`).
export default async function (t: Smoke) {
  const { check, api, me } = t;
  const items = JSON.parse(readFileSync(new URL("../../apps/worker/src/generated/content.json", import.meta.url), "utf8")) as { id: string; cefr: string }[];
  const cefr = new Map(items.map((i) => [i.id, i.cefr]));

  const res = await api("/words?lang=lt", me);
  const { words } = (await res.json()) as { words: { id: string; text: string; meaning: string; learned: boolean; due: number | null; fromReading: boolean }[] };
  check(res.ok && words.length > 0, "my words: the Lithuanian list has the words learned so far");
  check(words.every((w) => w.text && w.meaning), "my words: every word has its text and Russian meaning");
  check(words.some((w) => w.fromReading && w.text === "euras"), "my words: a word added from a text is listed and marked");
  const easy = words.filter((w) => w.id.startsWith("lt-") && ["A1", "A2"].includes(cefr.get(w.id) ?? ""));
  check(easy.length === 0, `original bot: no Lithuanian A1–A2 word as a new card (${easy.map((w) => w.text).join(", ") || "none"})`);

  const es = (await (await api("/words?lang=es", me)).json()) as { words: { meaning: string }[] };
  check(es.words.length > 0 && es.words.every((w) => /[a-z]/i.test(w.meaning)), "my words: Spanish words with English meanings");
  check((await api("/words?lang=xx", me)).status === 400, "my words: an unknown language → 400");
}
