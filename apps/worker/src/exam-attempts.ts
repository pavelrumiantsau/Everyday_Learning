// Mock exam attempts (migration 0013): each part is saved as JSON when it's done; the result follows the NŠA rules
// (packages/core/src/exam.ts). Used by features/exams.ts (Mini App) and features/tasks.ts (speaking in the chat).
import { examResult, type ExamLevel, type ExamResult, type PartPoints } from "@el/core";
import type { TaskFeedback } from "@el/llm";

export interface RwPart {
  points: PartPoints;
  /** Chosen option per question of each choice task (rw order, writing tasks skipped). */
  answers: (number | null)[][];
  /** Per writing task: the learner's text and the AI's feedback. */
  writing: { text: string; feedback: TaskFeedback }[];
}
export interface ListeningPart { points: PartPoints; answers: (number | null)[][] }
export interface SpeakingPart { scores: number[] }

export interface ExamAttempt {
  id: number;
  examId: string;
  startedAt: number;
  rw: RwPart | null;
  listening: ListeningPart | null;
  speaking: SpeakingPart | null;
  finishedAt: number | null;
}

interface Row { id: number; exam_id: string; started_at: number; rw: string | null; listening: string | null; speaking: string | null; finished_at: number | null }

const fromRow = (r: Row): ExamAttempt => ({
  id: r.id,
  examId: r.exam_id,
  startedAt: r.started_at,
  rw: r.rw ? (JSON.parse(r.rw) as RwPart) : null,
  listening: r.listening ? (JSON.parse(r.listening) as ListeningPart) : null,
  speaking: r.speaking ? (JSON.parse(r.speaking) as SpeakingPart) : null,
  finishedAt: r.finished_at,
});

export async function startAttempt(d1: D1Database, examId: string, now: number): Promise<number> {
  const r = await d1.prepare("INSERT INTO exam_attempt (exam_id, started_at) VALUES (?, ?) RETURNING id").bind(examId, now).first<{ id: number }>();
  return r!.id;
}

/** The latest attempt of an exam (finished or not). */
export async function latestAttempt(d1: D1Database, examId: string): Promise<ExamAttempt | null> {
  const r = await d1.prepare("SELECT * FROM exam_attempt WHERE exam_id = ? ORDER BY id DESC LIMIT 1").bind(examId).first<Row>();
  return r ? fromRow(r) : null;
}

export async function attemptById(d1: D1Database, id: number): Promise<ExamAttempt | null> {
  const r = await d1.prepare("SELECT * FROM exam_attempt WHERE id = ?").bind(id).first<Row>();
  return r ? fromRow(r) : null;
}

export async function allAttempts(d1: D1Database): Promise<ExamAttempt[]> {
  const { results } = await d1.prepare("SELECT * FROM exam_attempt ORDER BY id").all<Row>();
  return results.map(fromRow);
}

export const attemptResult = (level: ExamLevel, a: ExamAttempt): ExamResult =>
  examResult(level, { rw: a.rw?.points ?? null, listening: a.listening?.points ?? null, speaking: a.speaking?.scores ?? null });

/** Saves one part; the attempt is finished when all three parts are there. Returns the updated attempt. */
export async function savePart(d1: D1Database, id: number, part: "rw" | "listening" | "speaking", value: RwPart | ListeningPart | SpeakingPart, now: number): Promise<ExamAttempt> {
  await d1.prepare(`UPDATE exam_attempt SET ${part} = ? WHERE id = ?`).bind(JSON.stringify(value), id).run();
  await d1.prepare("UPDATE exam_attempt SET finished_at = ? WHERE id = ? AND finished_at IS NULL AND rw IS NOT NULL AND listening IS NOT NULL AND speaking IS NOT NULL").bind(now, id).run();
  return (await attemptById(d1, id))!;
}
