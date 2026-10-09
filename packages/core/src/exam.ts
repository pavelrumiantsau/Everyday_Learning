// Mock exams of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.1, §6.5): the Basic–I category state language
// exam (A1–A2) in the NŠA format — reading and writing (tasks 1–4 A1, 22 points; 5–9 A2, 28 points), listening (2 + 2
// tasks, 10 + 10 points), speaking (3 situations 0–3 + 0–1 from the interviewing examiner). Each part gives A1, A2 or
// nothing; the exam gives the lowest level of the three parts.
// Files: content/lt/exams/<nnnn>-<slug>.yaml, one exam per file, validated by scripts/build-content.ts. Foundation only.
// Writing tasks and speaking situations are ordinary tasks (content/lt/tasks/exam.yaml, ids lt-t-0101+ / lt-s-0101+)
// so the AI scores them the same way as in the course.
import { z } from "zod";

export type ExamLevel = "A1" | "A2";

/** Points of each part and the NŠA pass marks (60% of the level's points, as NŠA publishes them). */
export const EXAM_POINTS = {
  rw: { A1: 22, A2: 28 },
  listening: { A1: 10, A2: 10 },
  speaking: 10,
} as const;
export const EXAM_PASS = {
  rw: { A1: 13, A2: 17 },
  listening: { A1: 6, A2: 6 },
} as const;
/** A writing task's 0–3 score counts twice: one writing task is worth 6 points. */
export const WRITING_WEIGHT = 2;
export const SPEAKING_SITUATIONS = 3;

const Choice = z
  .object({
    /** Lithuanian question (empty for a gap: the gap number is the question). */
    q: z.string().trim().default(""),
    options: z.array(z.string().trim().min(1)).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .superRefine((q, ctx) => {
    if (q.answer >= q.options.length) ctx.addIssue({ code: "custom", path: ["answer"], message: "answer must be an index into options" });
  });
export type ExamChoice = z.infer<typeof Choice>;

const level = z.enum(["A1", "A2"]);

/** Reading: a text and questions with options, 1 point each. Gaps: a text with (1), (2)… and options per gap, 1 point each. */
const ChoiceTask = z.object({
  kind: z.enum(["reading", "gaps"]),
  cefr: level,
  /** Russian: what to do, as the exam says it. */
  instruction: z.string().trim().min(5),
  /** Lithuanian: the ad, note, menu, article… For gaps the text has (1), (2)… where the gaps are. */
  text: z.string().trim().min(20),
  questions: z.array(Choice).min(3).max(8),
});
/** Writing: a task from content/lt/tasks (lt-t-01xx), scored 0–3 by the AI, worth 6 points. */
const WritingTask = z.object({ kind: z.literal("writing"), cefr: level, task: z.string().regex(/^lt-t-\d{4}$/) });
export const ExamRwTask = z.discriminatedUnion("kind", [ChoiceTask.extend({ kind: z.literal("reading") }), ChoiceTask.extend({ kind: z.literal("gaps") }), WritingTask]);
export type ExamRwTask = z.infer<typeof ExamRwTask>;

/** Listening: a recording (played at most twice) and questions with options, 1 point each. Audio /audio/lt/<exam>-l<n>.mp3. */
export const ExamListeningTask = z.object({
  cefr: level,
  instruction: z.string().trim().min(5),
  lines: z.array(z.object({ speaker: z.string().trim().min(1).max(20), text: z.string().trim().min(1) })).min(1).max(16),
  questions: z.array(Choice).min(3).max(6),
});
export type ExamListeningTask = z.infer<typeof ExamListeningTask>;

export const taskPoints = (t: ExamRwTask): number => (t.kind === "writing" ? 3 * WRITING_WEIGHT : t.questions.length);

export const Exam = z
  .object({
    id: z.string().regex(/^lt-x-\d{4}$/, "id must look like lt-x-0001"),
    /** A1: only the A1 tasks (tasks 1–4, listening 1–2, A1 situations). A2: the full exam. */
    level,
    track: z.literal("foundation"),
    /** Russian. */
    title: z.string().trim().min(1).max(80),
    rw: z.array(ExamRwTask).min(4).max(9),
    listening: z.array(ExamListeningTask).min(2).max(4),
    /** Speaking situations: tasks from content/lt/tasks (lt-s-01xx). */
    speaking: z.array(z.string().regex(/^lt-s-\d{4}$/)).length(SPEAKING_SITUATIONS),
  })
  .superRefine((e, ctx) => {
    const levels: ExamLevel[] = e.level === "A1" ? ["A1"] : ["A1", "A2"];
    for (const l of ["A1", "A2"] as const) {
      const rw = e.rw.filter((t) => t.cefr === l).reduce((s, t) => s + taskPoints(t), 0);
      const li = e.listening.filter((t) => t.cefr === l).reduce((s, t) => s + t.questions.length, 0);
      const want = levels.includes(l);
      if (rw !== (want ? EXAM_POINTS.rw[l] : 0)) ctx.addIssue({ code: "custom", path: ["rw"], message: `${l} reading/writing tasks are worth ${rw} points, need ${want ? EXAM_POINTS.rw[l] : 0}` });
      if (li !== (want ? EXAM_POINTS.listening[l] : 0)) ctx.addIssue({ code: "custom", path: ["listening"], message: `${l} listening is worth ${li} points, need ${want ? EXAM_POINTS.listening[l] : 0}` });
    }
    const order = e.rw.map((t) => t.cefr).join(",");
    if (order !== [...order.split(",")].sort().join(",")) ctx.addIssue({ code: "custom", path: ["rw"], message: "A1 tasks come before A2 tasks" });
    e.rw.forEach((t, i) => {
      if (t.kind !== "gaps") return;
      const gaps = [...t.text.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
      if (gaps.join(",") !== t.questions.map((_, k) => k + 1).join(",")) ctx.addIssue({ code: "custom", path: ["rw", i, "text"], message: `gaps (1)…(${t.questions.length}) must appear in order, found ${gaps.join(",") || "none"}` });
    });
  });
export type Exam = z.infer<typeof Exam>;

/** Audio id of a listening recording. */
export const examListeningId = (examId: string, index: number) => `${examId}-l${index + 1}`;
/** What is spoken in a listening recording. */
export const examListeningSpeech = (t: Pick<ExamListeningTask, "lines">) => t.lines.map((x) => x.text).join(" ");

// ── Scoring ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PartPoints { A1: number; A2: number }

/** A part's level by the NŠA rules: A1 = A1 pass mark; A2 = A2 pass mark and A1 in the same part. */
export function partLevel(points: PartPoints, pass: { A1: number; A2: number }, examLevel: ExamLevel): ExamLevel | null {
  if (points.A1 < pass.A1) return null;
  return examLevel === "A2" && points.A2 >= pass.A2 ? "A2" : "A1";
}

/** Points of the choice tasks: `answers[task][question]` = chosen option index (missing = no answer). */
export function choicePoints(tasks: readonly { cefr: ExamLevel; questions: readonly ExamChoice[] }[], answers: readonly (readonly (number | null)[])[]): PartPoints {
  const p: PartPoints = { A1: 0, A2: 0 };
  tasks.forEach((t, i) => t.questions.forEach((q, k) => { if (answers[i]?.[k] === q.answer) p[t.cefr] += 1; }));
  return p;
}

/** Interviewing examiner's point (0–1). The app can't judge the conversation, so: every situation scored at least 1. */
export const interactionPoint = (scores: readonly number[]) => (scores.length === SPEAKING_SITUATIONS && scores.every((s) => s >= 1) ? 1 : 0);

/**
 * Speaking by the NŠA rules: A1 = at least 5 points with at least 2 in two situations; A2 = at least 6 points with two
 * situations together worth at least 5 (NŠA's examples: 2 + 2 + 1 + 1 → A1; 3 + 2 + 0 + 1 → A2).
 */
export function speakingLevel(scores: readonly number[], interaction: number, examLevel: ExamLevel): ExamLevel | null {
  const total = scores.reduce((s, x) => s + x, 0) + interaction;
  const sorted = [...scores].sort((a, b) => b - a);
  const a1 = total >= 5 && (sorted[1] ?? 0) >= 2;
  if (!a1) return null;
  return examLevel === "A2" && total >= 6 && (sorted[0] ?? 0) + (sorted[1] ?? 0) >= 5 ? "A2" : "A1";
}

export interface ExamParts {
  rw: PartPoints | null;
  listening: PartPoints | null;
  /** Situation scores 0–3 in order. */
  speaking: number[] | null;
}

export interface ExamResult {
  rw: ExamLevel | null;
  listening: ExamLevel | null;
  speaking: ExamLevel | null;
  /** The exam's result: the lowest level of the three parts; null if a part isn't passed or not done yet. */
  overall: ExamLevel | null;
  complete: boolean;
}

export function examResult(examLevel: ExamLevel, p: ExamParts): ExamResult {
  const rw = p.rw ? partLevel(p.rw, EXAM_PASS.rw, examLevel) : null;
  const listening = p.listening ? partLevel(p.listening, EXAM_PASS.listening, examLevel) : null;
  const speaking = p.speaking && p.speaking.length === SPEAKING_SITUATIONS ? speakingLevel(p.speaking, interactionPoint(p.speaking), examLevel) : null;
  const complete = !!p.rw && !!p.listening && !!p.speaking && p.speaking.length === SPEAKING_SITUATIONS;
  const levels = [rw, listening, speaking];
  const overall = !complete || levels.includes(null) ? null : levels.every((l) => l === "A2") ? "A2" : "A1";
  return { rw, listening, speaking, overall, complete };
}
