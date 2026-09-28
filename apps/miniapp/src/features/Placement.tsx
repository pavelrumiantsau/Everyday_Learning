// Placement test: mark upcoming Lithuanian words you already know, so lessons skip them.
import { grammarLabel, principalFormsLine } from "@el/core/labels";
import { useCallback, useEffect, useState } from "react";
import { getPlacement, savePlacement, type PlacementBatch } from "../api";
import type { MiniFeature } from "../features";
import { haptic } from "../telegram";

function HomeEntry({ open }: { open: () => void }) {
  const [placement, setPlacement] = useState<PlacementBatch | null>(null);
  useEffect(() => {
    getPlacement("lt").then(setPlacement, () => setPlacement(null));
  }, []);
  if (!placement || placement.remaining === 0) return null;
  const marked = placement.stats.known + placement.stats.unknown;
  return (
    <button className="secondary" onClick={open}>
      🇱🇹 Проверить, что я уже знаю
      <span className="hint small">
        {marked > 0
          ? `отмечено ${marked}, знаю ${placement.stats.known} · осталось ${placement.remaining}`
          : `слова из следующих уроков пропустятся · ${placement.remaining} слов`}
      </span>
    </button>
  );
}

function Screen({ close: onDone }: { close: () => void }) {
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

export const placementFeature: MiniFeature = { id: "placement", HomeEntry, Screen };
