import type { Exercise, Item, Lesson } from "@el/core";
import { tg } from "./telegram";

export type Lang = "lt" | "es" | "fr";
export interface Session { day: string; reviewsToday: number; newToday: number; due: number; known: Partial<Record<Lang, number>> }
export interface WordCard { cardId: string; kind: "recog" | "forms"; lang: Lang; item: Item }
/** Grammar exercise card (lt-g-0001:cloze1), created when a lesson is marked done. */
export interface ClozeCard { cardId: string; kind: "cloze"; lang: Lang; lessonId: string; lessonTitle: string; exercise: Exercise }
export type QueueCard = WordCard | ClozeCard;
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

export interface GrammarToday { day: string; lesson: Lesson | null; done: boolean }
export const getGrammarToday = () => call<GrammarToday>("/grammar/today");
export const getLesson = (id: string) => call<{ lesson: Lesson; done: boolean }>(`/grammar/lessons/${encodeURIComponent(id)}`);
export const markLessonDone = (id: string) =>
  call<{ done: boolean; created: number }>(`/grammar/lessons/${encodeURIComponent(id)}/done`, { method: "POST", body: "{}" });
