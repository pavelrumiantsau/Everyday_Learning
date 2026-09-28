import type { Smoke } from "./context.ts";

// Mistakes → "✏️ Как правильно?" cards, and the weekly review (/review). Runs after the AI checks, which save mistakes.
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls, llm } = t;
  type Fix = { cardId: string; kind: string; mistake?: { original: string; corrected: string } };
  const q = (await (await api("/queue?limit=200", me)).json()) as { cards: Fix[] };
  const fix = q.cards.find((c) => c.kind === "fix");
  check(!!fix?.mistake && fix.mistake.corrected !== fix.mistake.original, "a mistake from the tutor/feedback became a fix card in the review queue");
  if (fix) {
    const r = await api("/reviews", me, { method: "POST", body: JSON.stringify({ reviews: [{ id: crypto.randomUUID(), cardId: fix.cardId, rating: 3, reviewedAt: Date.now() }] }) });
    check(((await r.json()) as { applied: number }).applied === 1, "answering a fix card is saved like any review");
  }
  const s = (await (await api("/session", me)).json()) as { known: Record<string, number> };
  check(typeof s.known.lt === "number", "mistake cards don't break the word counts");

  calls.length = 0;
  llm.requests.length = 0;
  await post(msg("/review"));
  const text = calls.filter((c) => c.method === "sendMessage").map((c) => String(c.body.text)).join("\n");
  check(text.includes("Разбор ошибок за неделю") && llm.requests.some((r) => r.path.endsWith("/chat/completions")), "/review sends an AI review of the week's mistakes");
}
