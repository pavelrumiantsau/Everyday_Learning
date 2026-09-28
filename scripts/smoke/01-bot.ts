import type { Smoke } from "./context.ts";

// Bot: webhook security, lessons, quiz polls, answers.
export default async function (t: Smoke) {
  const { post, msg, calls, check, OWNER } = t;
  check((await post(msg("/today"), "wrong")).status === 403, "wrong webhook secret → 403");

  calls.length = 0;
  await post(msg("/today", 999));
  check(calls.length === 0, "messages from other users are ignored");

  await post(msg("/today"));
  check(calls.some((c) => c.method === "sendMessage" && c.body.text.includes("К повторению")), "/today answers the owner");

  calls.length = 0;
  await post(msg("/lesson"));
  const polls = calls.filter((c) => c.method === "sendPoll");
  const lesson = calls.find((c) => c.method === "sendMessage");
  check(!!lesson?.body.text.includes("laikas"), "morning lesson lists the first Lithuanian word");
  check(polls.length === 8, `8 quiz polls for 15 new words (max_new_polls), got ${polls.length}`);
  check(polls.every((p) => p.body.type === "quiz" && p.body.is_anonymous === false), "polls are non-anonymous quizzes");

  // answer the first poll correctly, the second wrongly, the first again (duplicate)
  const p1 = polls[0]!.body, p2 = polls[1]!.body;
  const ans = (id: string, option: number) => post({ update_id: Date.now(), poll_answer: { poll_id: id, user: { id: Number(OWNER) }, option_ids: [option] } });
  await ans("poll-1", p1.correct_option_id);
  await ans("poll-2", (p2.correct_option_id + 1) % p2.options.length);
  await ans("poll-1", p1.correct_option_id);

  calls.length = 0;
  await post(msg("/today"));
  const today = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(today.includes("Ответов сегодня: 2"), "two answers recorded, duplicate ignored");
  check(/К повторению сейчас: [1-9]/.test(today), "the wrong answer is due again soon");

  calls.length = 0;
  await post(msg("/lesson"));
  const lesson2 = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(lesson2.includes("skubėti") && !lesson2.includes("<b>laikas</b>"), "a second lesson brings the next words (skubėti…), not the same ones");

  calls.length = 0;
  await post(msg("/today"));
  const today2 = calls.find((c) => c.method === "sendMessage")?.body.text ?? "";
  check(!today2.includes("Утренний урок придёт"), "/lesson counts as today's morning lesson (no second one from cron)");


  t.state.lesson = lesson;
  t.state.polls = polls;
}
