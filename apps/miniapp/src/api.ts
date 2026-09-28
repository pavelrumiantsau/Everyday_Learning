import type { Exercise, Item, Lesson } from "@el/core";
import { tg } from "./telegram";

export type Lang = "lt" | "es" | "fr";
export interface Session { day: string; reviewsToday: number; newToday: number; due: number; known: Partial<Record<Lang, number>> }
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

export const getSession = () => call<Session>("/session");
export const getQueue = (limit = 100) => call<{ cards: QueueCard[] }>(`/queue?limit=${limit}`).then((r) => r.cards);

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
  flushing ??= (async () => {
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
    } finally {
      flushing = null;
    }
  })();
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
export const markLessonDone = (id: string) =>
  call<{ done: boolean; created: number }>(`/grammar/lessons/${encodeURIComponent(id)}/done`, { method: "POST", body: "{}" });

// --- Reading mode
export interface TextSummary { id: string; lang: Lang; cefr: string; title: string; topic: string; words: number; read: boolean }
export interface ReadingQuestion { q: string; options: string[]; answer: number }
export interface ReadingTextFull { id: string; cefr: string; title: string; topic: string; text: string; questions: ReadingQuestion[] }
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
export const getTexts = () => call<{ texts: TextSummary[] }>("/reading").then((r) => r.texts);
export const getText = (id: string) => call<{ text: ReadingTextFull; read: boolean }>(`/reading/texts/${encodeURIComponent(id)}`);
export const markTextRead = (id: string, correct: number, total: number) =>
  call<{ ok: true }>(`/reading/texts/${encodeURIComponent(id)}/done`, { method: "POST", body: JSON.stringify({ correct, total }) });
export const lookupWord = (b: { lang: Lang; word: string; sentence: string; textId: string }) =>
  call<WordInfo>("/reading/lookup", { method: "POST", body: JSON.stringify(b) });
export const addWordToCards = (b: Omit<WordInfo, "source" | "added"> & { lang: Lang; example: string }) =>
  call<{ added: true; itemId: string }>("/reading/cards", { method: "POST", body: JSON.stringify(b) });
