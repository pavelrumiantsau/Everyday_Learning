// "✏️ Как правильно?" — a learner's own mistake: see the wrong fragment, recall the correct one, then compare.
import { wordDiff } from "@el/core/diff";
import { useState } from "react";
import type { FixCard, Rating } from "../api";
import { FLAG } from "../flags";

const RATINGS: { rating: Rating; label: string; cls: string }[] = [
  { rating: 1, label: "Снова", cls: "again" },
  { rating: 2, label: "Трудно", cls: "hard" },
  { rating: 3, label: "Хорошо", cls: "good" },
  { rating: 4, label: "Легко", cls: "easy" },
];

export function FixReview({ card, position, progress, onAnswer }: { card: FixCard; position: string; progress: number; onAnswer: (r: Rating) => void }) {
  const [revealed, setRevealed] = useState(false);
  const diff = wordDiff(card.mistake.original, card.mistake.corrected);
  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="hint small">
        {FLAG[card.lang]} {position} · ✏️ из твоих ошибок
      </p>
      <button className="card" onClick={() => setRevealed(true)} aria-disabled={revealed}>
        <span className="badge">Как правильно?</span>
        <span className="fix-line">
          {diff.a.map((t, i) => (
            <span key={i} className={revealed && t.changed ? "del" : undefined}>{t.text} </span>
          ))}
        </span>
        {revealed ? (
          <span className="answer">
            <span className="fix-line">
              {diff.b.map((t, i) => (
                <span key={i} className={t.changed ? "ins" : undefined}>{t.text} </span>
              ))}
            </span>
            {card.mistake.explanation && <span className="note">💡 {card.mistake.explanation}</span>}
          </span>
        ) : (
          <span className="hint tap">Скажи правильно вслух и нажми</span>
        )}
      </button>
      <div className="spacer" />
      {revealed ? (
        <div className="ratings">
          {RATINGS.map((r) => (
            <button key={r.rating} className={`rate ${r.cls}`} onClick={() => onAnswer(r.rating)}>{r.label}</button>
          ))}
        </div>
      ) : (
        <button className="button big" onClick={() => setRevealed(true)}>Показать исправление</button>
      )}
    </main>
  );
}
