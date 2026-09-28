import type { Smoke } from "./context.ts";

// Grammar lessons: /rule, lesson API, "done" → cloze cards in the review queue, no double morning message.
export default async function (t: Smoke) {
  const { check, api, me, post, msg, calls, base } = t;
  type Lesson = { id: string; title: string; exercises: { answer: string }[] };

  calls.length = 0;
  await post(msg("/help"));
  check(!!calls.find((c) => c.method === "sendMessage")?.body.text.includes("/rule"), "/help lists /rule");

  calls.length = 0;
  await post(msg("/rule"));
  const rule = calls.find((c) => c.method === "sendMessage")?.body;
  const button = rule?.reply_markup?.inline_keyboard?.[0]?.[0];
  check(!!rule?.text.includes("📘 <b>Правило дня:"), "/rule sends the rule of the day");
  check(!!button?.web_app?.url?.includes("screen=grammar"), "the rule message has a Mini App button that opens the grammar screen");

  check((await api("/grammar/today", null)).status === 401, "grammar API needs Telegram login");
  const today = (await (await api("/grammar/today", me)).json()) as { lesson: Lesson | null; done: boolean };
  const lesson = today.lesson;
  // /rule works on any day (Sunday falls back to Lithuanian), so today has a lesson: the first one of LT, ES or FR (Saturday).
  check(!!lesson && /^(lt|es|fr)-g-0001$/.test(lesson.id) && !today.done, `today's lesson is the first not-done one (${lesson?.id})`);
  check(!!lesson && rule?.text.includes(lesson.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")), "the message names today's lesson");
  if (!lesson) return;

  const byId = await api("/grammar/lessons/lt-g-0003", me);
  const l3 = (await byId.json()) as { lesson: Lesson };
  check(byId.ok && l3.lesson.id === "lt-g-0003" && l3.lesson.exercises.length >= 4, "a lesson can be loaded by id");
  check((await api("/grammar/lessons/lt-g-9999", me)).status === 404, "unknown lesson → 404");

  const done = async (id: string) =>
    (await (await api(`/grammar/lessons/${id}/done`, me, { method: "POST", body: "{}" })).json()) as { created: number };
  check((await done(lesson.id)).created === lesson.exercises.length, `marking the lesson done creates ${lesson.exercises.length} cloze cards`);
  check((await done(lesson.id)).created === 0, "marking it done again creates nothing new");

  type Card = { cardId: string; kind: string; lessonId?: string; exercise?: { answer: string; text: string } };
  const { cards } = (await (await api("/queue?limit=200", me)).json()) as { cards: Card[] };
  const cloze = cards.filter((c) => c.kind === "cloze");
  check(cloze.length === lesson.exercises.length && cloze.every((c) => c.lessonId === lesson.id), "the review queue returns the lesson's cloze cards");
  const first = cloze.find((c) => c.cardId === `${lesson.id}:cloze1`);
  check(first?.exercise?.answer === lesson.exercises[0]!.answer && first.exercise.text.includes("___"), "a cloze card carries its sentence and answer");

  // Placement «Грамматика»: upcoming lessons with 2 exercises; a known lesson is marked done without cards.
  type Diag = { lessons: { id: string; exercises: unknown[] }[] };
  const diag = async () => ((await (await api("/grammar/diagnostic?lang=lt", me)).json()) as Diag).lessons;
  const d1 = await diag();
  check(d1.length > 5 && d1.every((l) => l.id.startsWith("lt-g-") && l.exercises.length === 2) && !d1.some((l) => l.id === lesson.id),
    "grammar diagnostic lists not-done LT lessons with 2 exercises each");
  const known = (await (await api("/grammar/lessons/lt-g-0010/done", me, { method: "POST", body: JSON.stringify({ cards: false }) })).json()) as { created: number };
  check(known.created === 0, "a lesson known from the diagnostic is marked done without cards");
  check(!(await diag()).some((l) => l.id === "lt-g-0010"), "the diagnostic then skips that lesson");

  const after = (await (await api("/grammar/today", me)).json()) as { lesson: Lesson | null; done: boolean };
  check(after.lesson?.id === lesson.id && after.done, "today's lesson stays the same after it's done, marked done");

  const review = { id: crypto.randomUUID(), cardId: first!.cardId, rating: 3, reviewedAt: Date.now() };
  const saved = (await (await api("/reviews", me, { method: "POST", body: JSON.stringify({ reviews: [review] }) })).json()) as { applied: number };
  check(saved.applied === 1, "a cloze card answer is saved like any other review");

  calls.length = 0;
  await fetch(`${base}/__scheduled?cron=*/15+*+*+*+*`);
  await new Promise((r) => setTimeout(r, 500)); // the tick runs in waitUntil
  check(!calls.some((c) => c.method === "sendMessage" && String(c.body.text).includes("Правило дня")), "the cron doesn't send today's rule again after /rule");

  calls.length = 0;
  await post(msg("/rule"));
  check(!!calls.find((c) => c.method === "sendMessage")?.body.text.includes(lesson.title.split(":")[0]!), "/rule still answers on request");
}
