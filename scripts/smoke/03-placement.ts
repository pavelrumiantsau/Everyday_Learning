import type { Smoke } from "./context.ts";

// Placement test.
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls } = t;
  // --- Placement ---
  type Placement = { items: { id: string; text: string }[]; remaining: number; stats: { known: number; unknown: number } };
  const pl1 = (await (await api("/placement?lang=lt", me)).json()) as Placement;
  check(pl1.items.length === 30 && pl1.items[0]!.id === "lt-w-0021", `placement starts at the next unseen word (${pl1.items[0]?.text})`);
  const knownVerb = pl1.items[0]!; // išsiaiškinti (a verb)
  const unknownWord = pl1.items[1]!;
  await api("/placement", me, { method: "POST", body: JSON.stringify({ results: [{ itemId: knownVerb.id, known: true }, { itemId: unknownWord.id, known: false }] }) });
  const pl2 = (await (await api("/placement?lang=lt", me)).json()) as Placement;
  check(pl2.remaining === pl1.remaining - 2 && pl2.stats.known === 1 && pl2.stats.unknown === 1, "placement answers are saved and not asked again");
  const q2 = (await (await api("/queue", me)).json()) as { cards: { cardId: string }[] };
  check(q2.cards.some((c) => c.cardId === `${knownVerb.id}:forms`) && !q2.cards.some((c) => c.cardId === `${knownVerb.id}:recog`),
    "a known verb skips the meaning card but still gets a 3-forms card");
  calls.length = 0;
  await post(msg("/lesson"));
  const lesson3 = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(!lesson3.includes("skubėti") && lesson3.includes(unknownWord.text), "lessons skip known words and keep unknown ones");

}
