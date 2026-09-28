import type { Smoke } from "./context.ts";

// Input log, weekly report, report-a-mistake.
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls } = t;
  const lastText = () => calls.filter((c) => c.method === "sendMessage").at(-1)?.body.text ?? "";

  calls.length = 0;
  await post(msg("/input 30 lt podcast LRT"));
  check(lastText().includes("30 мин") && lastText().includes("🇱🇹"), "/input logs listening time");
  await post(msg("/input abc"));
  check(lastText().includes("Формат"), "/input with bad arguments explains the format");

  const r = await api("/input", me, { method: "POST", body: JSON.stringify({ lang: "lt", minutes: 45, kind: "radio" }) });
  const body = (await r.json()) as { week: Record<string, number> };
  check(r.ok && body.week.lt === 75, "Mini App input adds up for the week (30 + 45 min)");
  check((await api("/input", me, { method: "POST", body: JSON.stringify({ lang: "xx", minutes: 5 }) })).status === 400, "invalid input is rejected");

  calls.length = 0;
  await post(msg("/week"));
  const week = lastText();
  check(week.includes("Неделя") && week.includes("1 ч 15 мин") && week.includes("цель — 3 ч"), "/week report shows days, answers and input vs the 3 h target");
  check(!week.includes("Новых слов в день теперь"), "/week on demand never changes settings");

  check((await api("/report", me, { method: "POST", body: JSON.stringify({ itemId: "lt-w-0001", cardId: "lt-w-0001:recog", text: "test" }) })).ok, "a card can be reported from the Mini App");
  check((await api("/report", me, { method: "POST", body: JSON.stringify({}) })).status === 400, "an empty report is rejected");
  calls.length = 0;
  await post(msg("/report неверный перевод"));
  check(lastText().includes("Спасибо"), "/report thanks the learner");
}
