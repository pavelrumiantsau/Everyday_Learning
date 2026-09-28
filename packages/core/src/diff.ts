// Word-level diff (LCS) to highlight what changed between a learner's fragment and its correction.
export interface DiffToken {
  text: string;
  changed: boolean;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const norm = (w: string) => w.toLowerCase().replace(/[.,!?;:«»"“”()]/g, "");

export function wordDiff(a: string, b: string): { a: DiffToken[]; b: DiffToken[] } {
  const x = words(a), y = words(b);
  const L = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      L[i]![j] = norm(x[i]!) === norm(y[j]!) ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const keepA = new Set<number>(), keepB = new Set<number>();
  for (let i = 0, j = 0; i < x.length && j < y.length; ) {
    if (norm(x[i]!) === norm(y[j]!)) {
      keepA.add(i++);
      keepB.add(j++);
    } else if (L[i + 1]![j]! >= L[i]![j + 1]!) i++;
    else j++;
  }
  return {
    a: x.map((text, i) => ({ text, changed: !keepA.has(i) })),
    b: y.map((text, j) => ({ text, changed: !keepB.has(j) })),
  };
}

/** True when two texts differ only in case, spacing or punctuation (not worth a card). */
export function sameIgnoringPunctuation(a: string, b: string): boolean {
  return words(a).map(norm).join(" ") === words(b).map(norm).join(" ");
}
