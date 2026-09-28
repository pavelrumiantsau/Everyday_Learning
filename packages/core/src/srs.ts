import { createEmptyCard, fsrs, Rating, type Card, type CardInput, type Grade } from "ts-fsrs";

const scheduler = fsrs();

export type CardJson = CardInput;

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

/** Quiz answers are binary: right → Good, wrong → Again. The Mini App (weeks 2–3) will use all 4 ratings. */
export function reviewQuiz(card: CardJson, now: Date, correct: boolean): Card {
  return scheduler.next(card, now, correct ? Rating.Good : Rating.Again).card;
}

/** Flashcard answer from the Mini App: 1 Again, 2 Hard, 3 Good, 4 Easy. */
export function reviewCard(card: CardJson, now: Date, rating: 1 | 2 | 3 | 4): Card {
  return scheduler.next(card, now, rating as Grade).card;
}

export { Rating };
