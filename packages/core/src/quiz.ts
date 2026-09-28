import { langOf, meaningOf, type Item } from "./schema";

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

const OPTION_COUNT = 4;

/** Multiple choice "text → meaning" with distractors from other items of the same language. */
export function buildQuiz(item: Item, pool: readonly Item[], rng: () => number = Math.random): Quiz {
  const answer = meaningOf(item);
  const distractors = shuffle(
    [...new Set(pool.filter((p) => p.id !== item.id && langOf(p) === langOf(item)).map(meaningOf))].filter(
      (m) => m !== answer,
    ),
    rng,
  ).slice(0, OPTION_COUNT - 1);
  const options = shuffle([answer, ...distractors], rng);
  const example = item.examples[0];
  return {
    question: `${item.stress ?? item.text} → ?`,
    options,
    correctIndex: options.indexOf(answer),
    explanation: example ? `${example.text} — ${example.translation}` : undefined,
  };
}

export function shuffle<T>(xs: readonly T[], rng: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
