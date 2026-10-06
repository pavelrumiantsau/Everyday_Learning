import type { Smoke } from "./context.ts";

// Settings, stats, pause, reverse cards.
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls, base } = t;
  const lastText = () => calls.filter((c) => c.method === "sendMessage").at(-1)?.body.text ?? "";

  calls.length = 0;
  await post(msg("/stats"));
  check(lastText().includes("Серия") && lastText().includes("Последние 30 дней"), "/stats shows streak and the 30-day calendar");

  const put = (body: object) => api("/settings", me, { method: "PUT", body: JSON.stringify(body) });
  const r0 = await put({ new_per_day: { lt: 3 } });
  check(r0.ok, "settings can be saved from the Mini App");
  const s1 = (await (await api("/settings", me)).json()) as { prefs: { new_per_day: Record<string, number>; morning: string } };
  check(s1.prefs.new_per_day.lt === 3 && s1.prefs.new_per_day.es === 5 && s1.prefs.morning === "07:50", "saved values override defaults, the rest stay");
  check((await put({ new_per_day: { lt: 99 } })).status === 400, "invalid settings are rejected");

  calls.length = 0;
  await post(msg("/new es 2"));
  const s2 = (await (await api("/settings", me)).json()) as { prefs: { new_per_day: Record<string, number> } };
  check(s2.prefs.new_per_day.es === 2 && lastText().includes("2"), "/new es 2 changes Spanish new words per day");

  const st = (await (await api("/stats", me)).json()) as { streak: number; last30: unknown[]; minAnswers: number };
  check(st.last30.length === 30 && st.minAnswers === 15 && typeof st.streak === "number", "stats API returns streak and 30 days");

  // Reverse cards appear once the meaning card is known (two correct answers, in review).
  const recogId = "lt-w-2764:recog";
  const rev = (rating: number) => ({ id: crypto.randomUUID(), cardId: recogId, rating, reviewedAt: Date.now() });
  await api("/reviews", me, { method: "POST", body: JSON.stringify({ reviews: [rev(4)] }) });
  await api("/reviews", me, { method: "POST", body: JSON.stringify({ reviews: [rev(4)] }) });
  const q = (await (await api("/queue", me)).json()) as { cards: { cardId: string; kind: string }[] };
  check(q.cards.some((c) => c.cardId === "lt-w-2764:prod" && c.kind === "prod"), "a known word gets a reverse card (meaning → word)");
  check(!q.cards.some((c) => c.cardId === "lt-w-2766:prod"), "words not yet known get no reverse card");

  // Pause: no lessons or reminders, /today says so; /pause off resumes.
  calls.length = 0;
  await post(msg("/pause 2"));
  check(lastText().includes("Пауза на 2"), "/pause 2 confirms the holiday");
  calls.length = 0;
  await fetch(`${base}/__scheduled?cron=*/15+*+*+*+*`);
  check(calls.length === 0, "nothing is sent while paused");
  await post(msg("/today"));
  check(lastText().includes("пауза"), "/today mentions the pause");
  await post(msg("/pause off"));
  await post(msg("/today"));
  check(!lastText().includes("пауза"), "/pause off resumes");
}
