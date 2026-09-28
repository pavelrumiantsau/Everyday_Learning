// Passive input (podcasts, radio, series, reading): this week's minutes and quick logging.
import { useEffect, useState } from "react";
import { getInputSources, getInputWeek, logInput, type InputSource, type Lang } from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic, openLink } from "../telegram";

const KINDS: { id: string; label: string }[] = [
  { id: "podcast", label: "🎧 Подкаст" },
  { id: "radio", label: "📻 Радио" },
  { id: "video", label: "📺 Видео/сериал" },
  { id: "reading", label: "📖 Чтение" },
  { id: "conversation", label: "🗣 Разговор" },
];
const TYPE_ICON: Record<string, string> = { podcast: "🎧", radio: "📻", video: "📺", reading: "📖" };
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
  const [sources, setSources] = useState<InputSource[]>([]);
  useEffect(() => {
    getInputSources().then((r) => setSources(r.sources), () => setSources([]));
  }, []);
  const suggested = sources.filter((s) => s.lang === lang);

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
      <button className="button big" onClick={() => void save()}>Отметить {fmt(minutes)}</button>
      {suggested.length > 0 && (
        <section className="sources">
          <h2>Что послушать {FLAG[lang]}</h2>
          {suggested.map((s) => (
            <button key={s.url} className="secondary source" onClick={() => { haptic("tap"); setTitle(s.title); openLink(s.url); }}>
              <span>{TYPE_ICON[s.type] ?? "🔗"} {s.title} <span className="hint small">· {s.level}</span></span>
              <span className="hint small source-note">{s.note}</span>
            </button>
          ))}
        </section>
      )}
      <div className="spacer" />
      <button className="secondary center-text" onClick={close}>На главную</button>
    </main>
  );
}

export const inputFeature: MiniFeature = { id: "input", HomeEntry, Screen };
