import { grammarLabel } from "@el/core/labels";
import { useState } from "react";
import { flushReviews, getQueue, recordReview, type QueueCard, type Rating } from "../api";
import { FLAG } from "../flags";
import { ReportButton } from "../ReportButton";
import { haptic } from "../telegram";

const RATINGS: { rating: Rating; label: string; cls: string }[] = [
  { rating: 1, label: "Снова", cls: "again" },
  { rating: 2, label: "Трудно", cls: "hard" },
  { rating: 3, label: "Хорошо", cls: "good" },
  { rating: 4, label: "Легко", cls: "easy" },
];

export function Review({ initial, onDone }: { initial: QueueCard[]; onDone: () => void }) {
  const [cards, setCards] = useState(initial);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const card = cards[index];

  const answer = async (rating: Rating) => {
    haptic("tap");
    recordReview(card!.cardId, rating);
    setAnswered((n) => n + 1);
    setRevealed(false);
    if (index + 1 < cards.length) {
      setIndex(index + 1);
      return;
    }
    // End of the list: cards answered "Снова" come back after a few minutes, so check again.
    await flushReviews();
    const more = await getQueue().catch(() => []);
    if (more.length) {
      setCards(more);
      setIndex(0);
    } else {
      haptic("done");
      setCards([]);
    }
  };

  if (!card) {
    return (
      <main className="screen center">
        <h1>Готово! 🎉</h1>
        <p className="hint">Ответов за сессию: {answered}</p>
        <button className="button" onClick={onDone}>На главную</button>
      </main>
    );
  }

  const { item } = card;
  const meaning = item.meaning.ru ?? item.meaning.en;
  const note = item.note?.ru ?? item.note?.en;
  const example = item.examples[0];
  const grammar = grammarLabel(item);
  const head = item.stress ?? item.text;
  const forms = item.forms && `${head} — ${item.forms.pres} — ${item.forms.past}`;
  const isForms = card.kind === "forms" && forms;
  const isProd = card.kind === "prod";

  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>
      <p className="hint small top-line">
        <span>
          {FLAG[card.lang]} {index + 1} / {cards.length}
        </span>
        {revealed && <ReportButton key={card.cardId} itemId={item.id} cardId={card.cardId} />}
      </p>
      {isProd ? (
        <button className={`card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)} disabled={revealed}>
          <span className="badge">Обратная · {FLAG[card.lang]}</span>
          <span className="word">{meaning}</span>
          {grammar && <span className="hint small">{grammar}</span>}
          {revealed ? (
            <span className="answer">
              <span className="meaning">{forms ?? (item.gen ? `${head}, ${item.gen}` : head)}</span>
              {note && <span className="note">💡 {note}</span>}
              {example && (
                <span className="example">
                  <i>{example.text}</i>
                  <span className="hint">{example.translation}</span>
                </span>
              )}
            </span>
          ) : (
            <span className="hint tap">Вспомни слово (с формами) и нажми</span>
          )}
        </button>
      ) : (
      <button className={`card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)} disabled={revealed}>
        {isForms && <span className="badge">3 формы</span>}
        <span className="word">{head}</span>
        {!isForms && item.gen && <span className="gen">{item.gen}</span>}
        {!isForms && grammar && <span className="hint small">{grammar}</span>}
        {revealed ? (
          <span className="answer">
            {isForms ? <span className="forms big">{forms}</span> : <span className="meaning">{meaning}</span>}
            {isForms ? <span className="hint">{meaning}</span> : forms && <span className="forms">{forms}</span>}
            {note && <span className="note">💡 {note}</span>}
            {example && (
              <span className="example">
                <i>{example.text}</i>
                <span className="hint">{example.translation}</span>
              </span>
            )}
          </span>
        ) : (
          <span className="hint tap">
            {isForms ? "Назови наст. и прош. время (3 л.): jis/ji …" : "Вспомни значение и нажми"}
          </span>
        )}
      </button>
      )}
      <div className="spacer" />
      {revealed ? (
        <div className="ratings">
          {RATINGS.map((r) => (
            <button key={r.rating} className={`rate ${r.cls}`} onClick={() => void answer(r.rating)}>
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <button className="button big" onClick={() => setRevealed(true)}>
          Показать ответ
        </button>
      )}
    </main>
  );
}
