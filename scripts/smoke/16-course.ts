import type { Smoke } from "./context.ts";

// Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.3): runs on the copy's Worker after 15-setup.ts, whose
// learner chose Lithuanian from zero (foundation course). New words follow the course map: unit 1 comes first.
export default async function (t: Smoke) {
  const { check, api, me } = t;
  const json = (body: object) => ({ method: "POST", body: JSON.stringify(body) });
  const get = async <T>(path: string) => (await (await api(path, me)).json()) as T;
  type Progress = { words: { total: number; learned: number; introduced: number }; check: number | null; complete: boolean };

  const session = await get<{ course: boolean; strictLetters: boolean }>("/session");
  check(session.course && session.strictLetters, "session: course on, strict letters for the A2 exam goal");

  const course = await get<{ units: { id: string; stage: string; progress: Progress }[]; current: string }>("/course");
  check(course.units.length >= 30 && course.units[0]!.stage === "sounds", `GET /api/course: ${course.units.length} units, sounds first`);
  check(course.current === "u01", `the current unit is u01 (units without content are skipped), got ${course.current}`);

  const u01 = await get<{ words: { id: string; introduced: boolean }[]; progress: Progress }>("/course/units/u01");
  const introduced = u01.words.filter((w) => w.introduced).map((w) => w.id);
  const firstEight = u01.words.slice(0, 8).map((w) => w.id).join(",");
  check(introduced.length === 8 && introduced.join(",") === firstEight, `the first lesson brings unit 1's first 8 items in course order (phrases, then words), got ${introduced.join(",")}`);

  check((await api("/course/units/u01/check", me, json({ correct: 11, total: 10 }))).status === 400, "unit check: impossible score → 400");
  const low = (await (await api("/course/units/u01/check", me, json({ correct: 7, total: 10 }))).json()) as { score: number; passed: boolean };
  check(low.score === 70 && !low.passed, "unit check 7/10 → 70%, not passed");
  const high = (await (await api("/course/units/u01/check", me, json({ correct: 9, total: 10 }))).json()) as { passed: boolean };
  await api("/course/units/u01/check", me, json({ correct: 5, total: 10 }));
  const after = await get<{ units: { id: string; progress: Progress }[]; current: string }>("/course");
  const p01 = after.units.find((u) => u.id === "u01")!.progress;
  check(high.passed && p01.check === 90 && p01.complete, "9/10 passes the unit; the best score is kept after a worse try");
  check(after.current === "u02", "after unit 1 the current unit is u02");

  const known = (await (await api("/course/units/u02/known", me, { method: "POST" })).json()) as { progress: Progress };
  check(known.progress.complete && known.progress.words.learned === known.progress.words.total, "«Я это знаю»: all unit 2 words count as learned");
  check((await api("/course/units/x99", me)).status === 404, "unknown unit → 404");
}

/** The original bot has no course. */
export async function ownerSide(t: Smoke) {
  const { check, api, me } = t;
  check((await api("/course", me)).status === 404, "original bot: GET /api/course → 404");
  const s = (await (await api("/session", me)).json()) as { course: boolean; strictLetters: boolean };
  check(!s.course && !s.strictLetters, "original bot: no course, no strict letters");
}
