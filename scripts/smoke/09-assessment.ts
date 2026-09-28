import type { Smoke } from "./context.ts";

// Quarterly self-check.
export default async function (t: Smoke) {
  const { check, post, msg, calls, OWNER } = t;
  calls.length = 0;
  await post(msg("/check"));
  const intro = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  if (!intro.includes("Самопроверка")) {
    check(intro.includes("целей нет"), "/check says there are no goals when today is outside every quarter");
    return;
  }
  const polls = calls.filter((c) => c.method === "sendPoll");
  check(
    polls.length === 2 && polls.every((p) => p.body.allows_multiple_answers === true && p.body.is_anonymous === false && !p.body.type),
    `self-check: one multiple-choice checklist per active language (LT, ES), got ${polls.length}`,
  );
  const first = polls[0]!;
  calls.length = 0;
  await post({ update_id: Date.now(), poll_answer: { poll_id: first.result.poll.id, user: { id: Number(OWNER) }, option_ids: [0, 1] } });
  const reply = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(reply.includes(`Отмечено 2 из ${first.body.options.length}`), "checklist answers are saved and summarised");
}
