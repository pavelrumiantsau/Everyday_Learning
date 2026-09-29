import type { Smoke } from "./context.ts";

// "More today": /more and the Mini App button take the next new words now; /rule next and /api/grammar/next give an
// extra rule ahead of the rotation (not today's rule, French grammar still held until April 2027).
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls } = t;
  type Session = { newToday: number };
  const session = async () => (await (await api("/session", me)).json()) as Session;

  const before = (await session()).newToday;
  calls.length = 0;
  await post(msg("/more es 3"));
  const reply = calls.find((c) => c.method === "sendMessage")?.body;
  check(!!reply?.text.includes("Ещё 3 новых"), "/more es 3 introduces 3 Spanish words now");
  check(!!reply?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url, "the /more reply has the cards button");

  const r = (await (await api("/more", me, { method: "POST", body: JSON.stringify({ lang: "lt", n: 2 }) })).json()) as {
    added: number;
    items: { id: string }[];
  };
  check(r.added === 2 && r.items.every((i) => i.id.startsWith("lt-")), "POST /api/more adds 2 Lithuanian words");
  check((await session()).newToday === before + 5, "extra words count as today's new cards");
  const { cards } = (await (await api("/queue?limit=300", me)).json()) as { cards: { cardId: string }[] };
  check(r.items.every((i) => cards.some((c) => c.cardId === `${i.id}:recog`)), "the extra words are due in reviews right away");

  const again = (await (await api("/more", me, { method: "POST", body: JSON.stringify({ lang: "lt", n: 2 }) })).json()) as {
    items: { id: string }[];
  };
  check(again.items.every((i) => !r.items.some((j) => j.id === i.id)), "the next /more continues after the previous words");

  const today = (await (await api("/grammar/today", me)).json()) as { lesson: { id: string } | null };
  const next = (await (await api("/grammar/next", me)).json()) as { lesson: { id: string } | null };
  check(!!next.lesson && next.lesson.id !== today.lesson?.id, "/api/grammar/next gives a lesson other than today's rule");
  const fr = (await (await api("/grammar/next?lang=fr", me)).json()) as { lesson: { id: string; order: number } | null };
  check(!fr.lesson || fr.lesson.order <= 99, "before April 2027 an extra French rule is only a sounds lesson");

  calls.length = 0;
  await post(msg("/rule next es"));
  const rule = calls.find((c) => c.method === "sendMessage")?.body;
  check(!!rule?.text.includes("Ещё одно правило") && rule.text.includes("🇪🇸"), "/rule next es offers the next Spanish rule");
  check(!!rule?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url?.includes("lesson=es-g-"), "its button opens that lesson in the Mini App");
}
