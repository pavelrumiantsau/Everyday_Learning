// Streak on the home screen; stats (30-day calendar, retention) and settings (new words, reminders, reverse cards).
import { useEffect, useState } from "react";
import { activeLangs, getSettings, getStats, saveSettings, type Lang, type Prefs, type Stats } from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

const LANG_NAME: Record<Lang, string> = { lt: "Литовский", es: "Испанский", fr: "Французский" };

function HomeEntry({ open }: { open: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    getStats().then(setStats, () => setStats(null));
  }, []);
  if (!stats) return null;
  const today = stats.todayDone ? "сегодня ✅" : `сегодня ${stats.last30.at(-1)?.reviews ?? 0}/${stats.minAnswers}`;
  return (
    <button className="secondary row" onClick={open}>
      <span>
        🔥 {stats.streak} {plural(stats.streak, "день", "дня", "дней")} подряд
        {stats.freezes > 0 && <span className="hint"> · ❄️ {stats.freezes}</span>}
      </span>
      <span className="hint small">{today} · статистика и настройки ›</span>
    </button>
  );
}

function Screen({ close }: { close: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    getStats().then(setStats, () => undefined);
    getSettings().then((r) => setPrefs(r.prefs), () => undefined);
  }, []);

  const save = async (patch: Partial<Prefs>) => {
    haptic("tap");
    try {
      const r = await saveSettings(patch);
      setPrefs(r.prefs);
      setSaved("Сохранено ✓");
    } catch (e) {
      setSaved(`Не сохранилось: ${String(e)}`);
    }
    setTimeout(() => setSaved(null), 1500);
  };

  return (
    <main className="screen">
      <h1>Прогресс</h1>
      {stats ? (
        <>
          <section className="tiles">
            <div className="tile">
              <span className="num">🔥 {stats.streak}</span>
              <span className="hint small">серия · рекорд {stats.best}</span>
            </div>
            <div className="tile">
              <span className="num">❄️ {stats.freezes}</span>
              <span className="hint small">заморозки</span>
            </div>
            <div className="tile">
              <span className="num">{stats.retention30 ?? "—"}{stats.retention30 !== null && "%"}</span>
              <span className="hint small">верно за 30 дн.</span>
            </div>
          </section>
          <div className="calendar" aria-label="Последние 30 дней">
            {stats.last30.map((d) => (
              <span
                key={d.day}
                className={`cal ${d.paused ? "paused" : d.done ? "done" : d.reviews > 0 ? "partial" : ""}`}
                title={`${d.day}: ${d.reviews} ответов`}
              />
            ))}
          </div>
          <p className="hint small">
            Зелёный — день засчитан ({stats.minAnswers}+ ответов), жёлтый — начат, серый — пауза. За 7 дней подряд — ❄️ заморозка,
            она спасает серию в пропущенный день.
          </p>
          <p className="hint">
            Слов в работе: {activeLangs().filter((l) => stats.known[l]).map((l) => `${FLAG[l]} ${stats.known[l]}`).join("   ") || "пока нет"}
          </p>
        </>
      ) : (
        <p className="hint">Загрузка…</p>
      )}

      <h2>Настройки</h2>
      {prefs ? (
        <section className="settings">
          {activeLangs().map((l) => (
            <div className="setting" key={l}>
              <span>
                {FLAG[l]} {LANG_NAME[l]}: новых в день
              </span>
              <Stepper value={prefs.new_per_day[l] ?? 0} min={0} max={30} onChange={(v) => void save({ new_per_day: { [l]: v } })} />
            </div>
          ))}
          {activeLangs().map((l) => (
            <label className="setting" key={`r-${l}`}>
              <span>
                {FLAG[l]} Обратные карточки <span className="hint small">(значение → слово)</span>
              </span>
              <input
                type="checkbox"
                checked={prefs.reverse[l] ?? false}
                onChange={(e) => void save({ reverse: { [l]: e.target.checked } })}
              />
            </label>
          ))}
          <label className="setting">
            <span>☀️ Утренний урок</span>
            <input type="time" value={prefs.morning} onChange={(e) => e.target.value && void save({ morning: e.target.value })} />
          </label>
          <label className="setting">
            <span>🌙 Напоминание</span>
            <input type="time" value={prefs.evening} onChange={(e) => e.target.value && void save({ evening: e.target.value })} />
          </label>
          <div className="setting">
            <span>Квизов в утреннем сообщении</span>
            <Stepper value={prefs.max_new_polls} min={0} max={20} onChange={(v) => void save({ max_new_polls: v })} />
          </div>
          <div className="setting">
            <span>Ответов для зачёта дня</span>
            <Stepper value={prefs.min_day_answers} min={5} max={100} step={5} onChange={(v) => void save({ min_day_answers: v })} />
          </div>
          <p className="hint small">Пауза (отпуск, болезнь): напиши боту /pause 3 — серия не сгорит.</p>
        </section>
      ) : (
        <p className="hint">Загрузка…</p>
      )}
      {saved && <div className="toast">{saved}</div>}
      <div className="spacer" />
      <button className="secondary center-text" onClick={close}>На главную</button>
    </main>
  );
}

function Stepper({ value, min, max, step = 1, onChange }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <span className="stepper">
      <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label="меньше">−</button>
      <span className="num-sm">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label="больше">+</button>
    </span>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const profileFeature: MiniFeature = { id: "profile", HomeEntry, Screen };
