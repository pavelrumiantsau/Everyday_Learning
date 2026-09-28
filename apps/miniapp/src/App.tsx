import { grammarLabel, principalFormsLine } from "@el/core/labels";
import { useCallback, useEffect, useState } from "react";
import {
  flushReviews,
  getPlacement,
  getQueue,
  getSession,
  recordReview,
  savePlacement,
  type PlacementBatch,
  type QueueCard,
  type Rating,
  type Session,
} from "./api";
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
  const [placement, setPlacement] = useState<PlacementBatch | null>(null);
  const [placing, setPlacing] = useState(false);
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
    getPlacement("lt").then(setPlacement, () => setPlacement(null));
  }, [queue]);

  useEffect(() => {
    const app = tg;
    if (!(queue || placing) || !app) return;
    const back = () => {
      setQueue(null);
      setPlacing(false);
      void refresh();
    };
    app.BackButton.show();
    app.BackButton.onClick(back);
    return () => {
      app.BackButton.offClick(back);
      app.BackButton.hide();
    };
  }, [queue, placing, refresh]);

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
  if (placing) {
    return (
      <Placement
        onDone={() => {
          setPlacing(false);
          void refresh();
          getPlacement("lt").then(setPlacement, () => setPlacement(null));
        }}
      />
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
      {placement && placement.remaining > 0 && (
        <button className="secondary" onClick={() => setPlacing(true)}>
          🇱🇹 Проверить, что я уже знаю
          <span className="hint small">
            {placement.stats.known + placement.stats.unknown > 0
              ? `отмечено ${placement.stats.known + placement.stats.unknown}, знаю ${placement.stats.known} · осталось ${placement.remaining}`
              : `слова из следующих уроков пропустятся · ${placement.remaining} слов`}
          </span>
        </button>
      )}
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
  const grammar = grammarLabel(item);
  const head = item.stress ?? item.text;
  const forms = item.forms && `${head} — ${item.forms.pres} — ${item.forms.past}`;
  const isForms = card.kind === "forms" && forms;

  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>
      <p className="hint small">
        {FLAG[card.lang]} {index + 1} / {cards.length}
      </p>
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

function Placement({ onDone }: { onDone: () => void }) {
  const [batch, setBatch] = useState<PlacementBatch | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<{ itemId: string; known: boolean }[]>([]);
  const [saved, setSaved] = useState(0); // results already sent
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setBatch(null);
    setIndex(0);
    setResults([]);
    setSaved(0);
    getPlacement("lt").then(setBatch, (e) => setError(String(e)));
  }, []);
  useEffect(load, [load]);

  // Send every 5 answers (and at the end), so closing the app loses little.
  useEffect(() => {
    const done = batch && index >= batch.items.length;
    if (results.length - saved >= 5 || (done && results.length > saved)) {
      const chunk = results.slice(saved);
      setSaved(results.length);
      savePlacement(chunk).catch((e) => setError(String(e)));
    }
  }, [results, saved, batch, index]);

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось сохранить.</p>
        <p className="hint small">{error}</p>
        <button className="button" onClick={onDone}>На главную</button>
      </main>
    );
  }
  if (!batch) return <main className="screen center hint">Загрузка…</main>;

  const item = batch.items[index];
  if (!item) {
    const knew = results.filter((r) => r.known).length;
    return (
      <main className="screen center">
        <h1>{knew} из {results.length}</h1>
        <p className="hint">
          {knew} слов пропустятся в уроках, остальные придут по порядку.
          {batch.remaining - results.length > 0 ? ` Осталось проверить: ${batch.remaining - results.length}.` : ""}
        </p>
        {batch.remaining - results.length > 0 && (
          <button className="button" onClick={load}>Ещё {Math.min(30, batch.remaining - results.length)}</button>
        )}
        <button className="secondary center-text" onClick={onDone}>На главную</button>
      </main>
    );
  }

  const answer = (known: boolean) => {
    haptic("tap");
    setResults((r) => [...r, { itemId: item.id, known }]);
    setRevealed(false);
    setIndex((i) => i + 1);
  };
  const forms = principalFormsLine(item);

  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / batch.items.length) * 100}%` }} />
      </div>
      <p className="hint small">
        🇱🇹 Знаешь это слово? {index + 1} / {batch.items.length}
      </p>
      <button className="card" onClick={() => setRevealed(true)} disabled={revealed}>
        <span className="word">{item.stress ?? item.text}</span>
        {forms !== (item.stress ?? item.text) && <span className="gen">{forms.split(", ").slice(1).join(", ")}</span>}
        <span className="hint small">{grammarLabel(item)}</span>
        {revealed ? (
          <span className="answer">
            <span className="meaning">{item.meaning.ru ?? item.meaning.en}</span>
          </span>
        ) : (
          <span className="hint tap">Вспомни значение и нажми</span>
        )}
      </button>
      <div className="spacer" />
      {revealed ? (
        <div className="ratings two">
          <button className="rate again" onClick={() => answer(false)}>Не знал</button>
          <button className="rate good" onClick={() => answer(true)}>Знал</button>
        </div>
      ) : (
        <button className="button big" onClick={() => setRevealed(true)}>Показать значение</button>
      )}
    </main>
  );
}
