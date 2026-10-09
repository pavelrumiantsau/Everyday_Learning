import type { Exercise, Item, Lesson } from "@el/core";
import { tg } from "./telegram";

export type Lang = "lt" | "es" | "fr";
/** `learning`: new words not learned yet («Учить новые слова»); they are not part of `due`. */
/** `langs`: the languages this learner studies; `needsSetup`: a personal copy whose setup wizard isn't answered yet. */
export interface Session { day: string; reviewsToday: number; newToday: number; due: number; learning: number; known: Partial<Record<Lang, number>>; langs: Lang[]; needsSetup: boolean; course: boolean; strictLetters: boolean }
export interface WordCard { cardId: string; kind: "recog" | "forms" | "prod"; lang: Lang; item: Item }
/** Grammar exercise card (lt-g-0001:cloze1), created when a lesson is marked done. */
export interface ClozeCard { cardId: string; kind: "cloze"; lang: Lang; lessonId: string; lessonTitle: string; exercise: Exercise }
/** A learner's own mistake (saved by the AI tutor/feedback), reviewed as "how is it right?". */
export interface FixCard { cardId: string; kind: "fix"; lang: Lang; mistake: { original: string; corrected: string; explanation: string } }
export type QueueCard = WordCard | ClozeCard | FixCard;
export type Rating = 1 | 2 | 3 | 4;
interface PendingReview { id: string; cardId: string; rating: Rating; reviewedAt: number }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `tma ${tg?.initData ?? ""}`, ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

let langs: Lang[] = ["lt", "es", "fr"];
let strict = false;
/** Exam practice: an answer with a missing Lithuanian letter (a for ą) counts as wrong. */
export const strictLetters = () => strict;
/** The learner's languages (from the last session load): screens offer only these. */
export const activeLangs = (): Lang[] => langs;
export const getSession = () =>
  call<Session>("/session").then((s) => {
    langs = s.langs?.length ? s.langs : langs;
    strict = !!s.strictLetters;
    return s;
  });
export const getQueue = (limit = 100) => call<{ cards: QueueCard[] }>(`/queue?limit=${limit}`).then((r) => r.cards);
/** The next new words to learn (meaning cards, oldest first) and how many are waiting in total. */
export const getLearn = (limit = 5) => call<{ cards: WordCard[]; total: number }>(`/learn?limit=${limit}`);

// Answers are kept on the device until the server confirms them, so a bad connection loses nothing.
const PENDING_KEY = "el.pending.v1";
const readPending = (): PendingReview[] => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") as PendingReview[];
  } catch {
    return [];
  }
};
const writePending = (xs: PendingReview[]) => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(xs));
  } catch {
    // storage unavailable: answers are still sent right away
  }
};
let memoryPending: PendingReview[] = readPending();

export function recordReview(cardId: string, rating: Rating) {
  memoryPending.push({ id: crypto.randomUUID(), cardId, rating, reviewedAt: Date.now() });
  writePending(memoryPending);
  void flushReviews();
}

let flushing: Promise<void> | null = null;
export function flushReviews(): Promise<void> {
  if (flushing) return flushing;
  // Nothing to send: return without touching `flushing`. (With nothing pending the async body below would run its
  // `finally` synchronously, before `flushing` is assigned, and leave a finished promise there — every later answer
  // would then stay on the device until the app restarts, and «Учить новые слова» would show the same words again.)
  if (!memoryPending.length) return Promise.resolve();
  const run = (async () => {
    try {
      while (memoryPending.length) {
        const batch = memoryPending.slice(0, 100);
        await call("/reviews", { method: "POST", body: JSON.stringify({ reviews: batch }) });
        const sent = new Set(batch.map((r) => r.id));
        memoryPending = memoryPending.filter((r) => !sent.has(r.id));
        writePending(memoryPending);
      }
    } catch {
      // offline or server error: keep them and try again on the next answer / app start
    }
  })();
  flushing = run.finally(() => {
    flushing = null;
  });
  return flushing;
}

export const pendingCount = () => memoryPending.length;

export interface PlacementBatch { items: Item[]; remaining: number; stats: { known: number; unknown: number } }
export const getPlacement = (lang: Lang = "lt") => call<PlacementBatch>(`/placement?lang=${lang}`);
export const savePlacement = (results: { itemId: string; known: boolean }[]) =>
  call<{ stats: { known: number; unknown: number } }>("/placement", { method: "POST", body: JSON.stringify({ results }) });

export interface Prefs {
  morning: string;
  evening: string;
  new_per_day: Partial<Record<Lang, number>>;
  max_new_polls: number;
  max_review_polls: number;
  min_day_answers: number;
  reverse: Partial<Record<Lang, boolean>>;
}
export interface Stats {
  day: string;
  streak: number;
  freezes: number;
  best: number;
  todayDone: boolean;
  minAnswers: number;
  known: Partial<Record<Lang, number>>;
  retention30: number | null;
  answers30: number;
  last30: { day: string; reviews: number; done: boolean; paused: boolean }[];
}
export const getStats = () => call<Stats>("/stats");
export const getSettings = () => call<{ prefs: Prefs; timezone: string }>("/settings");
export const saveSettings = (patch: Partial<Prefs>) => call<{ prefs: Prefs }>("/settings", { method: "PUT", body: JSON.stringify(patch) });

export const getInputWeek = () => call<{ week: Partial<Record<Lang, number>>; targetLt: number }>("/input/week");
export interface InputSource { lang: Lang; title: string; url: string; type: string; level: string; note: string }
export const getInputSources = () => call<{ sources: InputSource[] }>("/input/sources");
export const logInput = (b: { lang: Lang; minutes: number; kind: string; title?: string }) =>
  call<{ week: Partial<Record<Lang, number>> }>("/input", { method: "POST", body: JSON.stringify(b) });
export const reportItem = (b: { itemId?: string; cardId?: string; text?: string }) =>
  call<{ ok: true }>("/report", { method: "POST", body: JSON.stringify(b) });

export interface GrammarToday { day: string; lesson: Lesson | null; done: boolean }
export const getGrammarToday = () => call<GrammarToday>("/grammar/today");
export const getLesson = (id: string) => call<{ lesson: Lesson; done: boolean }>(`/grammar/lessons/${encodeURIComponent(id)}`);
/** An extra rule ahead of the rotation (the next not-done lesson; `lang` optional). */
/** «📚 Пройденные правила»: lessons sent as the rule of the day or marked done, newest first (`day`: last time seen). */
export interface SeenLesson { id: string; title: string; cefr: string; lang: Lang; exercises: number; day: string; done: boolean }
export const getGrammarHistory = () => call<{ lessons: SeenLesson[] }>("/grammar/history").then((r) => r.lessons);
export const getNextLesson = (lang?: Lang) => call<{ lesson: Lesson | null }>(`/grammar/next${lang ? `?lang=${lang}` : ""}`);
/** Next new words now instead of tomorrow morning: one daily portion per active language, or `n` of `lang`. */
export const addMoreWords = (b: { lang?: Lang; n?: number } = {}) =>
  call<{ added: number; items: { id: string; text: string }[] }>("/more", { method: "POST", body: JSON.stringify(b) });
export const markLessonDone = (id: string, opts: { cards?: boolean } = {}) =>
  call<{ done: boolean; created: number }>(`/grammar/lessons/${encodeURIComponent(id)}/done`, { method: "POST", body: JSON.stringify(opts) });
export interface DiagnosticLesson { id: string; title: string; cefr: string; exercises: Exercise[] }
export const getGrammarDiagnostic = (lang: Lang) => call<{ lessons: DiagnosticLesson[] }>(`/grammar/diagnostic?lang=${lang}`);

// --- Reading mode
export interface TextSummary { id: string; lang: Lang; cefr: string | null; title: string; topic: string; words: number; read: boolean; own?: true }
export interface ReadingQuestion { q: string; options: string[]; answer: number }
export interface ReadingTextFull { id: string; cefr: string | null; title: string; topic: string; text: string; source?: string; questions: ReadingQuestion[]; own?: true }
export interface ReadingList { texts: TextSummary[]; own: TextSummary[]; level: string; nextId: string | null }
export type ReadingRating = "easy" | "ok" | "hard";
export interface WordInfo {
  source: "glossary" | "cache" | "ai";
  lemma: string;
  pos?: string;
  meaning: string;
  gender?: string;
  gen?: string;
  forms?: { pres: string; past: string };
  note?: string;
  added: boolean;
}
export const getReading = () => call<ReadingList>("/reading");
export const getText = (id: string) => call<{ text: ReadingTextFull; read: boolean }>(`/reading/texts/${encodeURIComponent(id)}`);
export const markTextRead = (id: string, correct: number, total: number, rating?: ReadingRating) =>
  call<{ ok: true; nextLevel: string }>(`/reading/texts/${encodeURIComponent(id)}/done`, { method: "POST", body: JSON.stringify({ correct, total, rating }) });
export const addOwnText = (b: { lang: Lang; title?: string; url?: string; text: string }) =>
  call<{ id: string; words: number }>("/reading/own", { method: "POST", body: JSON.stringify(b) });
export const deleteOwnText = (id: string) => call<{ ok: true }>(`/reading/own/${encodeURIComponent(id)}`, { method: "DELETE" });
export const lookupWord = (b: { lang: Lang; word: string; sentence: string; textId: string }) =>
  call<WordInfo>("/reading/lookup", { method: "POST", body: JSON.stringify(b) });
export const addWordToCards = (b: Omit<WordInfo, "source" | "added"> & { lang: Lang; example: string }) =>
  call<{ added: true; itemId: string }>("/reading/cards", { method: "POST", body: JSON.stringify(b) });

// --- setup wizard (personal copies) ---
export type Level = "A0" | "A1" | "A2" | "B1" | "B2";
export type Pace = "light" | "normal" | "intensive";
export interface LanguagePlan { course: "foundation" | "continuing" | "standard"; level: Level; exam?: { level: "A2"; date?: string } }
export interface LearnerProfile { version: 1; timezone: string; main: Lang; pace: Pace; languages: Partial<Record<Lang, LanguagePlan>>; created: string }
export interface PaceInfo { main: number; other: number; lessonsPerWeek: number; minutes: number }
export interface ProfileState {
  copy: boolean;
  profile: LearnerProfile | null;
  rhythm: { morning: string; evening: string; min_day_answers: number };
  timezone: string;
  paces: Record<Pace, PaceInfo>;
}
export const getProfile = () => call<ProfileState>("/profile");
export const saveProfile = (answers: { profile: LearnerProfile; morning: string; evening: string; min_day_answers: number }) =>
  call<{ ok: true }>("/profile", { method: "POST", body: JSON.stringify(answers) });

// --- Lithuanian foundation course (personal copies) ---
export interface UnitProgress {
  id: string;
  words: { total: number; learned: number; introduced: number };
  lessons: { total: number; done: number };
  texts: { total: number; read: number };
  exams: { total: number; passed: number };
  check: number | null;
  percent: number;
  complete: boolean;
}
export interface CourseUnitSummary { id: string; stage: "sounds" | "A1" | "A2" | "exam"; title: string; topic: number | null; can_do: string[]; progress: UnitProgress }
export interface CourseOverview { units: CourseUnitSummary[]; current: string | null; passPercent: number; checkSize: number }
export interface UnitDetail {
  unit: { id: string; stage: string; title: string; can_do: string[] };
  words: { id: string; text: string; stress: string | null; meaning: string; introduced: boolean; learned: boolean }[];
  lessons: { id: string; title: string; done: boolean }[];
  texts: { id: string; title: string; read: boolean }[];
  /** Writing tasks and speaking situations; `best` = best score 0–3 or null. */
  tasks: { id: string; kind: "writing" | "speaking"; title: string; best: number | null }[];
  listening: { id: string; kind: string; title: string }[];
  exams: { id: string; level: ExamLevel; title: string; passed: boolean }[];
  progress: UnitProgress;
}
export interface ListeningItem {
  id: string;
  kind: string;
  title: string;
  situation: string;
  lines: { speaker: string; text: string }[];
  questions: { q: string; options: string[]; answer: number }[];
}
export const getListening = (id: string) => call<ListeningItem>(`/course/listening/${id}`);
export const getCourse = () => call<CourseOverview>("/course");
export const getUnit = (id: string) => call<UnitDetail>(`/course/units/${id}`);
export const saveUnitCheck = (id: string, correct: number, total: number) =>
  call<{ score: number; passed: boolean }>(`/course/units/${id}/check`, { method: "POST", body: JSON.stringify({ correct, total }) });
/** Sends the task to the bot chat; the learner answers there. */
export const startTask = (id: string) => call<{ ok: true }>(`/tasks/${id}/start`, { method: "POST" });
// --- mock exams (foundation course) ---
export type ExamLevel = "A1" | "A2";
export interface ExamQuestion { q: string; options: string[] }
export type ExamRwTask =
  | { kind: "reading" | "gaps"; cefr: ExamLevel; instruction: string; text: string; questions: ExamQuestion[] }
  | { kind: "writing"; cefr: ExamLevel; id: string; title: string; situation: string; prompt: string; words?: [number, number]; checklist: string[] };
export interface ExamContent {
  id: string;
  level: ExamLevel;
  title: string;
  points: { rw: Partial<Record<ExamLevel, number>>; listening: Partial<Record<ExamLevel, number>>; speaking: number };
  pass: { rw: Record<ExamLevel, number>; listening: Record<ExamLevel, number> };
  rw: ExamRwTask[];
  listening: { cefr: ExamLevel; instruction: string; audio: string; questions: ExamQuestion[] }[];
  speaking: { id: string; title: string; situation: string; prompt: string }[];
}
export interface ExamResult { rw: ExamLevel | null; listening: ExamLevel | null; speaking: ExamLevel | null; overall: ExamLevel | null; complete: boolean }
export interface WritingFeedback { score: number; checklist: boolean[]; corrected: string; mistakes: { original: string; corrected: string; explanation: string }[]; comment: string }
export interface ExamAttemptView {
  id: number;
  startedAt: number;
  finishedAt: number | null;
  rw: { points: Record<ExamLevel, number>; answers: (number | null)[][]; correct: number[][]; writing: { text: string; feedback: WritingFeedback; example: string }[] } | null;
  listening: { points: Record<ExamLevel, number>; answers: (number | null)[][]; correct: number[][]; transcripts: { speaker: string; text: string }[][] } | null;
  speaking: { scores: number[] } | null;
  result: ExamResult;
}
export interface ExamState { exam: ExamContent; attempt: ExamAttemptView | null }
export const getExam = (id: string) => call<ExamState>(`/exams/${id}`);
export const startExam = (id: string) => call<ExamState>(`/exams/${id}/start`, { method: "POST" });
export const submitExamRw = (id: string, answers: (number | null)[][], writing: string[]) =>
  call<ExamState>(`/exams/${id}/rw`, { method: "POST", body: JSON.stringify({ answers, writing }) });
export const submitExamListening = (id: string, answers: (number | null)[][]) =>
  call<ExamState>(`/exams/${id}/listening`, { method: "POST", body: JSON.stringify({ answers }) });
/** Sends the speaking situations to the bot chat one by one; the learner answers by voice. */
export const startExamSpeaking = (id: string) => call<{ ok: true }>(`/exams/${id}/speaking`, { method: "POST" });

export const markUnitKnown = (id: string) => call<{ progress: UnitProgress }>(`/course/units/${id}/known`, { method: "POST" });
