import { useCallback, useEffect, useState } from "react";
import { flushReviews, getQueue, getSession, type QueueCard, type Session } from "./api";
import { FEATURES } from "./features";
import { FLAG } from "./flags";
import { Review } from "./screens/Review";
import { haptic, tg } from "./telegram";

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
  const [openFeature, setOpenFeature] = useState<string | null>(null);
  const [homeKey, setHomeKey] = useState(0); // remounts home entries so they reload their numbers
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await flushReviews();
      setSession(await getSession());
      setHomeKey((k) => k + 1);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);

  const goHome = useCallback(() => {
    setQueue(null);
    setOpenFeature(null);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const app = tg;
    if (!(queue || openFeature) || !app) return;
    app.BackButton.show();
    app.BackButton.onClick(goHome);
    return () => {
      app.BackButton.offClick(goHome);
      app.BackButton.hide();
    };
  }, [queue, openFeature, goHome]);

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
  const feature = FEATURES.find((f) => f.id === openFeature);
  if (feature?.Screen) return <feature.Screen close={goHome} />;
  if (queue) return <Review initial={queue} onDone={goHome} />;
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
      {FEATURES.map((f) => f.HomeEntry && <f.HomeEntry key={`${f.id}-${homeKey}`} open={() => setOpenFeature(f.id)} />)}
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
