// «Мои слова»: every word you have as cards, per language — search, learning / learned, next review, pronunciation.
import { useEffect, useMemo, useState } from "react";
import { activeLangs, getWords, type Lang, type MyWord } from "../api";
import { Play } from "../Audio";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";

function HomeEntry({ open }: { open: () => void }) {
  return (
    <button className="secondary" onClick={open}>
      📚 Мои слова
      <span className="hint small">все слова по языкам: поиск, что выучено, когда повтор</span>
    </button>
  );
}

type Filter = "all" | "learning" | "learned";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "learning", label: "🆕 Учу" },
  { id: "learned", label: "✅ Выучено" },
];
const PAGE = 200;
const DAY = 24 * 60 * 60 * 1000;

/** «повтор сегодня», «повтор через 5 дн.», «отложено» (moved out of reviews). */
function dueLabel(due: number | null): string {
  if (due === null) return "отложено";
  const days = Math.ceil((due - Date.now()) / DAY);
  return days <= 0 ? "повтор сегодня" : `повтор через ${days} дн.`;
}

// Search ignores case and stress marks (grave, acute, tilde), not letters: ž stays ž.
const plain = (s: string) => s.normalize("NFD").replace(/[̀́̃]/g, "").normalize("NFC").toLowerCase();

function Screen({ close }: { close: () => void }) {
  const langs = activeLangs();
  const [lang, setLang] = useState<Lang>(langs[0] ?? "lt");
  const [words, setWords] = useState<MyWord[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    setWords(null);
    setError(false);
    setShown(PAGE);
    getWords(lang).then(setWords, () => setError(true));
  }, [lang]);

  const list = useMemo(() => {
    const q = plain(query.trim());
    return (words ?? []).filter(
      (w) =>
        (filter === "all" || (filter === "learned") === w.learned) &&
        (!q || plain(w.text).includes(q) || w.meaning.toLowerCase().includes(q)),
    );
  }, [words, query, filter]);
  const learned = words?.filter((w) => w.learned).length ?? 0;

  return (
    <main className="screen">
      <h1>Мои слова</h1>
      {langs.length > 1 && (
        <div className="chips">
          {langs.map((l) => (
            <button key={l} className={`chip ${lang === l ? "on" : ""}`} onClick={() => setLang(l)}>{FLAG[l]}</button>
          ))}
        </div>
      )}
      <input className="text-input" placeholder="Поиск: слово или перевод" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? "on" : ""}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      {error ? (
        <p className="hint">Не получилось загрузить слова — попробуй ещё раз позже.</p>
      ) : !words ? (
        <p className="hint">Загрузка…</p>
      ) : (
        <>
          <p className="hint small">
            Всего {words.length} · выучено {learned} · найдено {list.length}. Новые сверху; ✅ — выучено, 🆕 — учится сейчас, 📖 — из текста.
          </p>
          <ul className="word-list">
            {list.slice(0, shown).map((w) => (
              <li key={w.id}>
                <span>
                  {w.learned ? "✅" : "🆕"} <b>{w.stress ?? w.text}</b> {w.fromReading && "📖"} <Play id={w.id} kind="word" small />
                </span>
                <span className="hint">
                  {w.meaning}
                  <br />
                  <small>{dueLabel(w.due)}</small>
                </span>
              </li>
            ))}
          </ul>
          {list.length > shown && (
            <button className="secondary center-text" onClick={() => setShown((n) => n + PAGE)}>
              Показать ещё ({list.length - shown})
            </button>
          )}
        </>
      )}
      <div className="spacer" />
      <button className="secondary center-text" onClick={close}>На главную</button>
    </main>
  );
}

export const wordsFeature: MiniFeature = { id: "words", HomeEntry, Screen };
