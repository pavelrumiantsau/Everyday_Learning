import { COPY_CLAIM, type Smoke } from "./context.ts";

// A colleague's personal copy (docs/EXTENSION-PLAN.md §3.1): no TELEGRAM_USER_ID; the first `/start <claim code>` binds the
// bot to that Telegram user. Nobody else can use it or mix results with the owner. Runs on its own Worker + database.
export default async function (t: Smoke) {
  const { post, msg, calls, check, api, initData, OWNER, base } = t;
  const STRANGER = 88;
  const sent = () => calls.filter((c) => c.method === "sendMessage");
  const groupMsg = (text: string, from: number) => ({ update_id: Date.now(), message: { message_id: 1, from: { id: from }, chat: { id: -100, type: "group" }, text } });

  // Before the claim: nothing works, the bot only says how to bind it.
  calls.length = 0;
  await post(msg("/today"));
  check(sent().length === 1 && sent()[0]!.body.text.includes("ещё не привязан"), "unclaimed copy: /today → only the «not bound yet» hint");
  calls.length = 0;
  check((await fetch(`${base}/__scheduled?cron=*/15+*+*+*+*`)).ok && calls.length === 0, "unclaimed copy: cron runs and sends nothing");
  check((await api("/session", t.me)).status === 403, "unclaimed copy: Mini App API → 403");
  calls.length = 0;
  await post(msg("/start wrong-code"));
  check(sent().length === 1 && sent()[0]!.body.text.includes("ещё не привязан"), "a wrong claim code doesn't bind the bot");
  calls.length = 0;
  await post(groupMsg(`/start ${COPY_CLAIM}`, Number(OWNER)));
  check(calls.length === 0, "the claim link doesn't work from a group chat");
  check((await api("/session", t.me)).status === 403, "still unclaimed after the wrong code and the group message");

  // The claim.
  calls.length = 0;
  await post(msg(`/start ${COPY_CLAIM}`));
  check(sent().some((c) => String(c.body.chat_id) === OWNER && c.body.text.includes("Привет")), "the claim link binds the bot and greets its owner");
  check((await api("/session", t.me)).status === 200, "the owner can use the Mini App");

  // Somebody else, even with the same link: one line, nothing else.
  calls.length = 0;
  await post(msg(`/start ${COPY_CLAIM}`, STRANGER));
  check(sent().length === 1 && String(sent()[0]!.body.chat_id) === String(STRANGER) && sent()[0]!.body.text.includes("личный бот"), "a second claim → «personal bot» line, owner unchanged");
  calls.length = 0;
  await post(msg("/today", STRANGER));
  await post(msg("Labas, kaip sekasi?", STRANGER));
  check(sent().length === 2 && sent().every((c) => String(c.body.chat_id) === String(STRANGER) && c.body.text.includes("личный бот")), "a stranger's commands and texts → only the «personal bot» line");
  check(!calls.some((c) => c.method !== "sendMessage"), "a stranger triggers no lessons, polls or AI calls");
  calls.length = 0;
  await post({ update_id: Date.now(), poll_answer: { poll_id: "poll-x", user: { id: STRANGER }, option_ids: [0] } });
  check(calls.length === 0, "a stranger's poll answer is ignored");
  check((await api("/session", await initData(STRANGER))).status === 403, "a stranger's Mini App → 403");

  // The owner: works in the private chat, groups are ignored.
  calls.length = 0;
  await post(msg("/today"));
  check(sent().some((c) => String(c.body.chat_id) === OWNER && c.body.text.includes("К повторению")), "/today works for the owner after the claim");
  calls.length = 0;
  await post(groupMsg("/today", Number(OWNER)));
  check(calls.length === 0, "the owner's messages in a group are ignored");
}
