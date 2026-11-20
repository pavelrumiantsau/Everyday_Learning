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

  // «Плохо помню» / «Повторить сейчас» on a learned word: its cards come back in «Повторить» (now or within minutes).
  const post = (body: object) => api("/words/again", me, { method: "POST", body: JSON.stringify(body) });
  const learned = words.find((w) => w.learned && w.due !== null && w.due > Date.now());
  if (learned) {
    check((await post({ id: learned.id, mode: "now" })).ok, "my words: «Повторить сейчас» on a learned word");
    const queue = (await (await api("/queue?limit=300", me)).json()) as { cards: { cardId: string }[] };
    check(queue.cards.some((c) => c.cardId.startsWith(`${learned.id}:`)), "my words: after «Повторить сейчас» the word is in «Повторить»");
    check((await post({ id: learned.id, mode: "relearn" })).ok, "my words: «Плохо помню» on a learned word");
    const after = (await (await api("/words?lang=lt", me)).json()) as { words: { id: string; learned: boolean; due: number | null }[] };
    const w = after.words.find((x) => x.id === learned.id);
    check(!!w && w.learned && w.due !== null && w.due < Date.now() + 60 * 60 * 1000, "my words: after «Плохо помню» the word is due again within the hour");
  } else check(false, "my words: a learned word to try «Плохо помню» on");
  check((await post({ id: "lt-nope", mode: "now" })).status === 404, "my words: «Повторить сейчас» on an unknown word → 404");
  check((await post({ id: "x", mode: "later" })).status === 400, "my words: an unknown mode → 400");

  const es = (await (await api("/words?lang=es", me)).json()) as { words: { meaning: string }[] };
  check(es.words.length > 0 && es.words.every((w) => /[a-z]/i.test(w.meaning)), "my words: Spanish words with English meanings");
  check((await api("/words?lang=xx", me)).status === 400, "my words: an unknown language → 400");
}
