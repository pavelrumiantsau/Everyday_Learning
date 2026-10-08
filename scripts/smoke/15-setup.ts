import type { Smoke } from "./context.ts";

const answers = (over: object = {}) => ({
  profile: { version: 1, timezone: "Europe/Vilnius", main: "lt", pace: "normal", languages: { lt: { course: "foundation", level: "A0", exam: { level: "A2" } } }, created: "2026-11-02", ...over },
  morning: "07:30",
  evening: "21:00",
  min_day_answers: 10,
});

// Setup wizard of a personal copy (docs/EXTENSION-PLAN.md §5): runs after 14-copy-owner.ts on the copy's Worker.
export default async function (t: Smoke) {
  const { post, msg, calls, check, api, me, base } = t;
  const json = (body: object) => ({ method: "POST", body: JSON.stringify(body) });
  const sent = () => calls.filter((c) => c.method === "sendMessage");

  const before = (await (await api("/profile", me)).json()) as { copy: boolean; profile: unknown; paces: Record<string, { main: number }> };
  check(before.copy === true && before.profile === null && before.paces.normal?.main === 8, "GET /api/profile: a copy without a profile, with the pace table");
  const s0 = (await (await api("/session", me)).json()) as { needsSetup: boolean };
  check(s0.needsSetup === true, "the Mini App session says the setup is needed");
  calls.length = 0;
  check((await fetch(`${base}/__scheduled?cron=*/15+*+*+*+*`)).ok && calls.length === 0, "cron sends nothing before the setup");

  check((await api("/profile", me, json(answers({ main: "es" })))).status === 400, "invalid answers → 400 (main language not chosen)");
  check((await api("/profile", me, json(answers({ timezone: "Mars/Base" })))).status === 400, "unknown time zone → 400");

  calls.length = 0;
  const saved = await api("/profile", me, json(answers()));
  check(saved.status === 200, "the wizard's answers are saved");
  const lesson = sent().find((c) => c.body.text.includes("🇱🇹"));
  check(!!lesson, "the first lesson arrives right after the setup");
  check(!sent().some((c) => /🇪🇸|🇫🇷/.test(c.body.text)), "Lithuanian only: no Spanish or French in the first lesson");

  const session = (await (await api("/session", me)).json()) as { needsSetup: boolean; langs: string[]; known: Record<string, number> };
  check(session.needsSetup === false && session.langs.join() === "lt", "session: setup done, languages = Lithuanian only");
  check(Object.keys(session.known).join() === "lt" && session.known.lt === 8, `8 new Lithuanian words (normal pace), got ${JSON.stringify(session.known)}`);
  const settings = (await (await api("/settings", me)).json()) as { prefs: { new_per_day: Record<string, number>; morning: string; min_day_answers: number }; timezone: string };
  check(JSON.stringify(settings.prefs.new_per_day) === JSON.stringify({ lt: 8, es: 0, fr: 0 }), "new words per day from the pace: lt 8, es 0, fr 0");
  check(settings.prefs.morning === "07:30" && settings.prefs.min_day_answers === 10 && settings.timezone === "Europe/Vilnius", "morning time, minimum day and time zone saved");

  calls.length = 0;
  await post(msg("/today"));
  check(sent().some((c) => c.body.text.includes("К повторению")), "/today works after the setup");
  calls.length = 0;
  await post(msg("/setup"));
  check(!!sent()[0]?.body.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url?.includes("screen=setup"), "/setup opens the wizard again");
  calls.length = 0;
  await post(msg("/help"));
  check(sent()[0]?.body.text.includes("/setup"), "a copy's /help lists /setup");

  // Changing the plan later keeps progress and sends no second «first lesson».
  calls.length = 0;
  check((await api("/profile", me, json(answers({ pace: "intensive" })))).status === 200 && calls.length === 0, "changing the pace later sends nothing");
  const s2 = (await (await api("/settings", me)).json()) as { prefs: { new_per_day: Record<string, number> } };
  check(s2.prefs.new_per_day.lt === 15, "intensive pace: 15 new words per day");
  const s3 = (await (await api("/session", me)).json()) as { known: Record<string, number> };
  check(s3.known.lt === 8, "progress kept after changing the plan");
}

/** On the original deployment the wizard does nothing: /setup explains, the profile API refuses to save. */
export async function ownerSide(t: Smoke) {
  const { post, msg, calls, check, api, me } = t;
  const state = (await (await api("/profile", me)).json()) as { copy: boolean; profile: unknown };
  check(state.copy === false && state.profile === null, "original bot: GET /api/profile → not a copy, no profile");
  check((await api("/profile", me, { method: "POST", body: JSON.stringify(answers()) })).status === 403, "original bot: saving a profile → 403");
  const session = (await (await api("/session", me)).json()) as { needsSetup: boolean; langs: string[] };
  check(session.needsSetup === false && session.langs.join() === "lt,es,fr", "original bot: no setup needed, all three languages");
  calls.length = 0;
  await post(msg("/setup"));
  check(calls.length === 1 && calls[0]!.body.text.includes("исходный план"), "original bot: /setup only explains");
  calls.length = 0;
  await post(msg("/help"));
  check(calls.length === 1 && !calls[0]!.body.text.includes("/setup"), "original bot: /help doesn't list /setup");
}
