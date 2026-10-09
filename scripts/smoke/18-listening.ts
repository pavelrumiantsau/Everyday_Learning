import type { Smoke } from "./context.ts";

// Listening practice (docs/EXTENSION-PLAN.md §6.5): on the copy's Worker after 16-course.ts (foundation learner).
// The unit page lists its listening item; the item has questions and its Reginutė audio is served with the Mini App.
export default async function (t: Smoke) {
  const { check, api, me, base } = t;
  const unit = (await (await api("/course/units/u01", me)).json()) as { listening: { id: string; kind: string }[] };
  const first = unit.listening[0];
  check(first?.id === "lt-l-0001", "the unit page lists its listening item");

  const res = await api("/course/listening/lt-l-0001", me);
  const l = (await res.json()) as { situation: string; lines: { text: string }[]; questions: { options: string[]; answer: number }[] };
  check(res.ok && l.lines.length > 0 && l.questions.length === 3, "a listening item has lines and three questions");
  check(l.questions.every((q) => q.answer >= 0 && q.answer < q.options.length), "every answer points to one of the options");
  check((await api("/course/listening/lt-l-9999", me)).status === 404, "an unknown listening item → 404");

  const mp3 = await fetch(`${base}/audio/lt/lt-l-0001.mp3`);
  check(mp3.ok && (await mp3.arrayBuffer()).byteLength > 1000, "the listening audio is served");
}

/** The original bot: no listening API. */
export async function ownerSide(t: Smoke) {
  const { check, api, me } = t;
  check((await api("/course/listening/lt-l-0001", me)).status === 404, "original bot: listening API → 404");
}
