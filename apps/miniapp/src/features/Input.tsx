// Passive input (podcasts, radio, series, reading): this week's minutes and quick logging.
import { useEffect, useState } from "react";
import { getInputWeek, logInput, type Lang } from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

const KINDS: { id: string; label: string }[] = [
  { id: "podcast", label: "🎧 Подкаст" },
  { id: "radio", label: "📻 Радио" },
  { id: "video", label: "📺 Видео/сериал" },
  { id: "reading", label: "📖 Чтение" },
  { id: "conversation", label: "🗣 Разговор" },
];
const MINUTES = [10, 15, 30, 45, 60, 90];
const LANGS: Lang[] = ["lt", "es", "fr"];
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} ч ${m % 60 ? `${m % 60} мин` : ""}`.trim() : `${m} мин`);

function HomeEntry({ open }: { open: () => void }) {
  const [week, setWeek] = useState<{ week: Partial<Record<Lang, number>>; targetLt: number } | null>(null);
  useEffect(() => {
    getInputWeek().then(setWeek, () => setWeek(null));
  }, []);
  if (!week) return null;
  const lt = week.week.lt ?? 0;
  return (
    <button className="secondary" onClick={open}>
      🎧 Слушал или читал? Отметить
      <span className="hint small">
        🇱🇹 за 7 дней: {fmt(lt)} из {fmt(week.targetLt)}
        {LANGS.filter((l) => l !== "lt" && week.week[l]).map((l) => ` · ${FLAG[l]} ${fmt(week.week[l]!)}`)}
      </span>
    </button>
  );
}

function Screen({ close }: { close: () => void }) {
  const [lang, setLang] = useState<Lang>("lt");
  const [kind, setKind] = useState("podcast");
  const [minutes, setMinutes] = useState(30);
  const [title, setTitle] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const save = async () => {
    haptic("tap");
    try {
      const r = await logInput({ lang, kind, minutes, title: title.trim() || undefined });
      haptic("done");
      setDone(`Отмечено ✓ За 7 дней ${FLAG[lang]}: ${fmt(r.week[lang] ?? 0)}`);
      setTitle("");
    } catch (e) {
      setDone(`Не сохранилось: ${String(e)}`);
    }
  };

  return (
    <main className="screen">
      <h1>Аудирование и чтение</h1>
      <p className="hint small">Всё, что слушал или читал вне приложения: подкасты, LRT, сериалы, книги. Цель для литовского — 3 часа в неделю.</p>
      <div className="chips">
        {LANGS.map((l) => (
          <button key={l} className={`chip ${lang === l ? "on" : ""}`} onClick={() => setLang(l)}>{FLAG[l]}</button>
        ))}
      </div>
      <div className="chips">
        {KINDS.map((k) => (
          <button key={k.id} className={`chip ${kind === k.id ? "on" : ""}`} onClick={() => setKind(k.id)}>{k.label}</button>
        ))}
      </div>
      <div className="chips">
        {MINUTES.map((m) => (
          <button key={m} className={`chip ${minutes === m ? "on" : ""}`} onClick={() => setMinutes(m)}>{fmt(m)}</button>
        ))}
      </div>
      <input className="text-input" placeholder="Название (необязательно)" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      {done && <p className="done-note">{done}</p>}
      <div className="spacer" />
      <button className="button big" onClick={() => void save()}>Отметить {fmt(minutes)}</button>
      <button className="secondary center-text" onClick={close}>На главную</button>
    </main>
  );
}

export const inputFeature: MiniFeature = { id: "input", HomeEntry, Screen };
