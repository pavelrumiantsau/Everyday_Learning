import type { Smoke } from "./context.ts";

// Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md), on the owner's Worker: map, blocks, answers, mistakes queue,
// diagnostic — and proof that none of it reaches the original flow (due count, today's answers, stats, bot messages).
export default async function (t: Smoke) {
  const { check, api, me, calls } = t;
  const json = (body: object) => ({ method: "POST", body: JSON.stringify(body) });
  const get = async <T>(path: string) => (await (await api(path, me)).json()) as T;
  type Session = { due: number; reviewsToday: number; newToday: number };
  type Stats = { answers30: number; streak: number };
  type Map = { parts: { part: number; blocks: { id: string; status: string; answered: number }[] }[]; due: number; mistakes: number; diagnostic: { tested: number; total: number } };
  const blockIn = (m: Map, id: string) => m.parts.flatMap((p) => p.blocks).find((b) => b.id === id);

  const before = { session: await get<Session>("/session"), stats: await get<Stats>("/stats") };
  calls.length = 0;

  const map = await get<Map>("/uk");
  check(map.parts.length === 13 && !!blockIn(map, "uk-b-0410"), `GET /api/uk: 13 parts, the vocative block is there (${map.diagnostic.total} blocks)`);
  check(blockIn(map, "uk-b-0410")!.status === "closed" && map.mistakes === 0, "a new block is closed, no mistakes yet");

  type Detail = { block: { exercises: unknown[] }; progress: { status: string; answered: number }; session: number[]; wrong: number[] };
  const first = await get<Detail>("/uk/blocks/uk-b-0410");
  check(first.session.length === 10 && first.session[0] === 0, "a block's first session: its first 10 exercises");
  check((await api("/uk/blocks/uk-b-9999", me)).status === 404, "unknown block → 404");
  await api("/uk/blocks/uk-b-0410/open", me, { method: "POST" });
  check((await get<Detail>("/uk/blocks/uk-b-0410")).progress.status === "open", "«Открыть блок» → open");

  // The first answer is wrong and an hour old, so its mistake card is due now.
  const answers = first.session.map((i, n) => ({ id: `smoke-uk-${n}`, exercise: `uk-b-0410:x${i + 1}`, correct: n > 0, mode: "learn", at: Date.now() - (n === 0 ? 3_600_000 : 0) }));
  const saved = (await (await api("/uk/answers", me, json({ answers }))).json()) as { saved: number };
  const again = (await (await api("/uk/answers", me, json({ answers }))).json()) as { saved: number };
  check(saved.saved === 10 && again.saved === 0, "10 answers saved; sending them again changes nothing");
  check((await api("/uk/answers", me, json({ answers: [{ id: "x", exercise: "uk-b-0410:x999", correct: true, mode: "learn" }] }))).status === 400, "an unknown exercise → 400");

  const after = await get<Detail>("/uk/blocks/uk-b-0410");
  check(after.progress.answered === 10 && after.wrong.join() === "0", "progress: 10 answered, exercise 1 in «Мои ошибки»");
  check(after.session[0] === 10, "the next session starts with the exercises not seen yet");
  const review = await get<{ cards: { id: string }[] }>("/uk/review");
  check(review.cards.some((c) => c.id === "uk-b-0410:x1"), "the wrong answer is in «Повторить ошибки»");
  await api("/uk/answers", me, json({ answers: [{ id: "smoke-uk-r1", exercise: "uk-b-0410:x1", correct: true, mode: "review" }] }));
  const review2 = await get<{ cards: { id: string }[] }>("/uk/review");
  check(!review2.cards.some((c) => c.id === "uk-b-0410:x1"), "answered right in review → rescheduled for later");

  const diag = await get<{ blocks: { id: string; exercises: { id: string }[] }[] }>("/uk/diagnostic?part=2");
  check(diag.blocks.length > 0 && diag.blocks.every((b) => b.exercises.length === 2), "diagnostic of part 2: two exercises per block");
  check((await api("/uk/diagnostic?part=14", me)).status === 400, "diagnostic: unknown part → 400");
  await api("/uk/diagnostic", me, json({ results: [{ block: "uk-b-0206", correct: 2 }] }));
  await api("/uk/blocks/uk-b-0106/known", me, { method: "POST" });
  const map2 = await get<Map>("/uk");
  check(blockIn(map2, "uk-b-0206")!.status === "known" && map2.diagnostic.tested === 1, "diagnostic 2/2 → the block counts as known");
  check(blockIn(map2, "uk-b-0106")!.status === "known", "«Я это знаю» → known");
  check(map2.mistakes === 1, "one exercise in the Ukrainian mistakes queue");

  // Part test, cheat sheet, search.
  const test = await get<{ items: { id: string }[] }>("/uk/parts/4/test");
  check(test.items.length === 20 && new Set(test.items.map((i) => i.id)).size === 20, "part test: 20 different exercises");
  check(test.items.every((i) => i.id.startsWith("uk-b-04")), "part test of part 4: only part 4 blocks");
  check((await api("/uk/parts/99/test", me)).status === 404, "part test: unknown part → 404");
  check((await api("/uk/parts/4/test", me, json({ correct: 21, total: 20 }))).status === 400, "part test: impossible score → 400");
  const low = (await (await api("/uk/parts/4/test", me, json({ correct: 15, total: 20 }))).json()) as { score: number; passed: boolean };
  const high = (await (await api("/uk/parts/4/test", me, json({ correct: 18, total: 20 }))).json()) as { passed: boolean };
  await api("/uk/parts/4/test", me, json({ correct: 10, total: 20 }));
  const map3 = await get<Map & { parts: { part: number; test: { best: number; passed: boolean } | null }[] }>("/uk");
  const p4 = map3.parts.find((p) => p.part === 4)!.test;
  check(low.score === 75 && !low.passed && high.passed && p4?.best === 90 && p4.passed, "part test: 75 % fails, 90 % passes; best score and pass are kept");
  const cheat = await get<{ rules: { blocks: { id: string; title: string }[] }[] }>("/uk/cheatsheet");
  check(cheat.rules.length === 15 && cheat.rules.every((r) => r.blocks.length > 0 && r.blocks.every((b) => b.title)), "cheat sheet: 15 rules, each linked to blocks");
  const found = await get<{ blocks: { id: string }[] }>(`/uk/search?q=${encodeURIComponent("кличний")}`);
  check(found.blocks.some((b) => b.id === "uk-b-0410"), "search «кличний» finds the vocative block");

  // The original flow is untouched.
  const s = await get<Session>("/session");
  const st = await get<Stats>("/stats");
  check(s.due === before.session.due && s.reviewsToday === before.session.reviewsToday && s.newToday === before.session.newToday, "original bot: due count and today's answers unchanged");
  check(st.answers30 === before.stats.answers30 && st.streak === before.stats.streak, "original bot: stats and streak unchanged");
  check(calls.length === 0, `original bot: no Telegram messages from the Ukrainian section (${calls.map((c) => c.method).join(", ") || "none"})`);
}

/** Personal copies don't get the section. */
export async function copySide(t: Smoke) {
  const { check, api, me } = t;
  check((await api("/uk", me)).status === 404, "personal copy: GET /api/uk → 404");
  check((await api("/uk/blocks/uk-b-0410", me)).status === 404, "personal copy: Ukrainian blocks → 404");
}
