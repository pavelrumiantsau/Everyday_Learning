import { readFileSync } from "node:fs";
import type { Smoke } from "./context.ts";

// Mock exams (docs/EXTENSION-PLAN.md §6.1, §6.5): on the copy's Worker after 18-listening.ts (foundation learner). The A1
// mock exam end to end: reading/writing (writing scored by the fake AI: 2/3 → 4 points), listening, speaking by voice in
// the chat (3 situations, 2 each + the examiner's point) → A1 by the NŠA rules; the exam unit counts as passed.
interface ExamJson { id: string; rw: { kind: string; questions?: { answer: number }[] }[]; listening: { questions: { answer: number }[] }[] }

export default async function (t: Smoke) {
  const { post, calls, check, api, me, OWNER } = t;
  const sent = () => calls.filter((c) => c.method === "sendMessage").map((c) => String(c.body.text));
  const waitFor = async (pred: () => boolean, ms = 15_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) if (pred()) return true;
    return false;
  };
  const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
  const exams = JSON.parse(readFileSync(new URL("../../apps/worker/src/generated/exams.json", import.meta.url), "utf8")) as ExamJson[];
  const a1 = exams.find((e) => e.id === "lt-x-0001")!;

  const list = (await (await api("/exams", me)).json()) as { exams: { id: string; passed: boolean; latest: unknown }[] };
  check(list.exams.length === 3 && list.exams.every((e) => !e.passed && e.latest === null), "GET /api/exams: 3 mock exams, none tried");

  const view = await (await api("/exams/lt-x-0001", me)).json();
  const raw = JSON.stringify(view);
  check(!raw.includes('"answer"') && !raw.includes('"lines"') && !raw.includes('"example"'), "the exam is sent without answers, transcripts or model answers");
  check((await api("/exams/lt-x-0001/rw", me, json({ answers: [] }))).status === 409, "a part can't be handed in before the exam is started");

  check((await api("/exams/lt-x-0001/start", me, { method: "POST" })).ok, "POST /exams/:id/start opens an attempt");
  const rwAnswers = a1.rw.filter((x) => x.kind !== "writing").map((x) => x.questions!.map((q) => q.answer));
  const rw = (await (await api("/exams/lt-x-0001/rw", me, json({ answers: rwAnswers, writing: ["Labas, Inga! Atsiprašau, šeštadienį negaliu ateiti, nes dirbu. Gal sekmadienį? Olga"] }))).json()) as {
    attempt: { rw: { points: { A1: number }; correct: number[][]; writing: { feedback: { score: number } }[] }; result: { rw: string } };
  };
  check(rw.attempt.rw.points.A1 === 16 + 4 && rw.attempt.result.rw === "A1", `part 1: 16 choice points + writing 2/3 × 2 = ${rw.attempt.rw.points.A1}/22 → A1`);
  check(rw.attempt.rw.correct.length === rwAnswers.length && rw.attempt.rw.writing[0]?.feedback.score === 2, "after handing in: correct answers and the writing feedback");
  check((await api("/exams/lt-x-0001/rw", me, json({ answers: rwAnswers }))).status === 409, "part 1 can't be handed in twice");

  const liAnswers = a1.listening.map((x) => x.questions.map((q, i) => (i === 0 ? (q.answer + 1) % 3 : q.answer)));
  const li = (await (await api("/exams/lt-x-0001/listening", me, json({ answers: liAnswers }))).json()) as { attempt: { listening: { points: { A1: number }; transcripts: unknown[] }; result: { listening: string; complete: boolean } } };
  check(li.attempt.listening.points.A1 === 8 && li.attempt.result.listening === "A1" && li.attempt.listening.transcripts.length === 2, "part 2: 8/10 → A1, transcripts shown");
  check(!li.attempt.result.complete, "no exam result before speaking");

  calls.length = 0;
  check((await api("/exams/lt-x-0001/speaking", me, { method: "POST" })).ok && sent().some((s) => s.includes("Пробный экзамен: говорение")) && sent().some((s) => s.includes("Устная ситуация")), "part 3: the first situation is sent to the chat");
  for (let i = 1; i <= 3; i++) {
    calls.length = 0;
    t.fakeResults.getFile = { file_id: `exam-voice-${i}`, file_path: `voice/exam_${i}.oga` };
    await post({ update_id: Date.now(), message: { message_id: 100 + i, from: { id: Number(OWNER) }, chat: { id: Number(OWNER), type: "private" }, voice: { file_id: `exam-voice-${i}`, duration: 30, mime_type: "audio/ogg" } } });
    const last = i === 3;
    check(await waitFor(() => sent().some((s) => (last ? s.includes("Итог экзамена") : s.includes("Следующая ситуация")))), last ? "after the third answer: the exam result in the chat" : `situation ${i} scored, the next one follows`);
  }
  check(sent().some((s) => s.includes("Говорение: 2 + 2 + 2") && s.includes("Итог экзамена: A1")), "speaking 2 + 2 + 2 + 1 → A1; the A1 mock exam is passed");

  const unit = (await (await api("/course/units/e02", me)).json()) as { exams: { passed: boolean }[]; progress: { complete: boolean } };
  check(unit.exams[0]?.passed === true && unit.progress.complete, "the exam unit e02 is complete");
}

/** The original bot: no exams API. */
export async function ownerSide(t: Smoke) {
  const { check, api, me } = t;
  check((await api("/exams", me)).status === 404 && (await api("/exams/lt-x-0001/start", me, { method: "POST" })).status === 404, "original bot: exams API → 404");
}
