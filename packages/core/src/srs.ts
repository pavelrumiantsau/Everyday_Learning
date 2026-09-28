import { createEmptyCard, fsrs, Rating, type Card, type CardInput } from "ts-fsrs";

const scheduler = fsrs();

export type CardJson = CardInput;

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

/** Quiz answers are binary: right → Good, wrong → Again. The Mini App (weeks 2–3) will use all 4 ratings. */
export function reviewQuiz(card: CardJson, now: Date, correct: boolean): Card {
  return scheduler.next(card, now, correct ? Rating.Good : Rating.Again).card;
}

export { Rating };
