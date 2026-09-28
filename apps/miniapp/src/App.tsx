import { useCallback, useEffect, useState } from "react";
import { flushReviews, getQueue, getSession, recordReview, type QueueCard, type Rating, type Session } from "./api";
import { haptic, tg } from "./telegram";

const FLAG: Record<string, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };
const BOT = "pavel_rumiantsau_learning_bot";

export function App() {
  if (!tg) {
    return (
      <main className="screen center">
        <h1>Everyday Learning</h1>
        <p className="hint">Это приложение открывается из Telegram.</p>
        <a className="button" href={`https://t.me/${BOT}`}>Открыть бота</a>
      </main>
    );
  }
  return <Learn />;
}

function Learn() {
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<QueueCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await flushReviews();
      setSession(await getSession());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);

  useEffect(() => {
    const app = tg;
    if (!queue || !app) return;
    const back = () => {
      setQueue(null);
      void refresh();
    };
    app.BackButton.show();
    app.BackButton.onClick(back);
    return () => {
      app.BackButton.offClick(back);
      app.BackButton.hide();
    };
  }, [queue, refresh]);

  const start = async () => {
    haptic("tap");
    try {
      setQueue(await getQueue());
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось связаться с сервером.</p>
        <p className="hint small">{error}</p>
        <button className="button" onClick={() => void refresh()}>Повторить</button>
      </main>
    );
  }
  if (queue) {
    return (
      <Review
        initial={queue}
        onDone={() => {
          setQueue(null);
          void refresh();
        }}
      />
    );
  }
  if (!session) return <main className="screen center hint">Загрузка…</main>;

  const known = Object.entries(session.known);
  return (
    <main className="screen">
      <header>
        <h1>Labas! 👋</h1>
        <p className="hint">{session.day}</p>
      </header>
      <section className="tiles">
        <div className="tile">
          <span className="num">{session.due}</span>
          <span className="hint small">к повторению</span>
        </div>
        <div className="tile">
          <span className="num">{session.reviewsToday}</span>
          <span className="hint small">ответов сегодня</span>
        </div>
        <div className="tile">
          <span className="num">{session.newToday}</span>
          <span className="hint small">новых сегодня</span>
        </div>
      </section>
      <p className="hint">
        Слов в работе: {known.length ? known.map(([l, n]) => `${FLAG[l] ?? l} ${n}`).join("   ") : "пока нет"}
      </p>
      <div className="spacer" />
      {session.due > 0 ? (
        <button className="button big" onClick={() => void start()}>
          Повторить ({session.due})
        </button>
      ) : (
        <p className="done-note">Всё повторено 🎉 Новые слова придут утром — или напиши боту /lesson.</p>
      )}
    </main>
  );
}

const RATINGS: { rating: Rating; label: string; cls: string }[] = [
  { rating: 1, label: "Снова", cls: "again" },
  { rating: 2, label: "Трудно", cls: "hard" },
  { rating: 3, label: "Хорошо", cls: "good" },
  { rating: 4, label: "Легко", cls: "easy" },
];

function Review({ initial, onDone }: { initial: QueueCard[]; onDone: () => void }) {
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
  const grammar = [item.pos, item.gender].filter(Boolean).join(", ");

  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>
      <p className="hint small">
        {FLAG[card.lang]} {index + 1} / {cards.length}
      </p>
      <button className={`card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)} disabled={revealed}>
        <span className="word">{item.stress ?? item.text}</span>
        {grammar && <span className="hint small">{grammar}</span>}
        {revealed ? (
          <span className="answer">
            <span className="meaning">{meaning}</span>
            {note && <span className="note">💡 {note}</span>}
            {example && (
              <span className="example">
                <i>{example.text}</i>
                <span className="hint">{example.translation}</span>
              </span>
            )}
          </span>
        ) : (
          <span className="hint tap">Вспомни значение и нажми</span>
        )}
      </button>
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
