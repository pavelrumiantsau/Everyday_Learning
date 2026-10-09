// «Курс»: the Lithuanian foundation course of a personal copy (docs/EXTENSION-PLAN.md §6.3) — units with progress,
// a unit page (can-do list, words, lessons, texts), a 10-question unit check and «Я это знаю» to skip a unit.
// Hidden when the learner isn't on the foundation course (GET /api/course → 404), e.g. on the original bot.
import { useEffect, useMemo, useState } from "react";
import { getCourse, getUnit, markUnitKnown, saveUnitCheck, type CourseOverview, type UnitDetail } from "../api";
import type { MiniFeature } from "../features";
import { haptic } from "../telegram";

const STAGE: Record<string, string> = { sounds: "Звуки и буквы", A1: "Уровень A1", A2: "Уровень A2", exam: "Экзамен" };

function HomeEntry({ open }: { open: () => void }) {
  const [course, setCourse] = useState<CourseOverview | null>(null);
  useEffect(() => {
    getCourse().then(setCourse, () => setCourse(null));
  }, []);
  if (!course) return null;
  const units = course.units.filter((u) => u.stage === "A1" || u.stage === "A2");
  const done = units.filter((u) => u.progress.complete).length;
  const current = course.units.find((u) => u.id === course.current);
  return (
    <button className="secondary row" onClick={open}>
      <span>📚 Курс: {current ? current.title : "готов"}</span>
      <span className="hint small">пройдено юнитов: {done} из {units.length} ›</span>
    </button>
  );
}

function Screen({ close }: { close: () => void }) {
  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = () => getCourse().then(setCourse, (e) => setError(String(e)));
  useEffect(() => void reload(), []);

  if (unitId) return <UnitScreen id={unitId} passPercent={course?.passPercent ?? 80} checkSize={course?.checkSize ?? 10} back={() => { setUnitId(null); void reload(); }} />;
  if (error) return <main className="screen center hint">{error}</main>;
  if (!course) return <main className="screen center hint">Загрузка…</main>;

  const stages = [...new Set(course.units.map((u) => u.stage))];
  return (
    <main className="screen">
      <div className="top-line">
        <h1>Курс литовского</h1>
        <button className="link" onClick={close}>Закрыть</button>
      </div>
      <p className="hint small">С нуля до экзамена A2. Юнит засчитан, когда всё выучено — или проверка юнита на {course.passPercent}%+.</p>
      {stages.map((stage) => (
        <section key={stage} className="settings-block">
          <h2>{STAGE[stage] ?? stage}</h2>
          {course.units.filter((u) => u.stage === stage).map((u) => (
            <button key={u.id} className={`secondary ${u.id === course.current ? "active" : ""}`} onClick={() => { haptic("tap"); setUnitId(u.id); }}>
              <span>{u.progress.complete ? "✅ " : u.id === course.current ? "▶ " : ""}{u.title}</span>
              <span className="hint small">
                {u.progress.words.total + u.progress.lessons.total + u.progress.texts.total > 0
                  ? `${u.progress.percent}% · слов ${u.progress.words.learned}/${u.progress.words.total}${u.progress.check !== null ? ` · проверка ${u.progress.check}%` : ""}`
                  : "материалы готовятся"}
              </span>
              <span className="progress unit-bar"><span className="bar" style={{ width: `${u.progress.percent}%` }} /></span>
            </button>
          ))}
        </section>
      ))}
    </main>
  );
}

function UnitScreen({ id, passPercent, checkSize, back }: { id: string; passPercent: number; checkSize: number; back: () => void }) {
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [mode, setMode] = useState<"view" | "check">("view");
  const [busy, setBusy] = useState(false);
  const reload = () => getUnit(id).then(setUnit, () => undefined);
  useEffect(() => void reload(), [id]);

  if (!unit) return <main className="screen center hint">Загрузка…</main>;
  if (mode === "check") return <UnitCheck unit={unit} size={checkSize} passPercent={passPercent} done={() => { setMode("view"); void reload(); }} />;

  const known = async () => {
    haptic("tap");
    setBusy(true);
    try {
      await markUnitKnown(id);
      await reload();
    } finally {
      setBusy(false);
    }
  };
  const p = unit.progress;
  return (
    <main className="screen">
      <div className="top-line">
        <button className="link" onClick={back}>‹ Все юниты</button>
        <span className="hint small">{p.percent}%{p.complete ? " ✅" : ""}</span>
      </div>
      <h1>{unit.unit.title}</h1>
      {unit.unit.can_do.length > 0 && (
        <section className="settings-block">
          <h2>После юнита я могу</h2>
          <ul className="summary-list">{unit.unit.can_do.map((c) => <li key={c}>{c}</li>)}</ul>
        </section>
      )}
      {unit.lessons.length > 0 && (
        <section className="settings-block">
          <h2>Правила</h2>
          <ul className="summary-list">{unit.lessons.map((l) => <li key={l.id}>{l.done ? "✅ " : ""}{l.title}</li>)}</ul>
        </section>
      )}
      {unit.texts.length > 0 && (
        <section className="settings-block">
          <h2>Тексты</h2>
          <ul className="summary-list">{unit.texts.map((t) => <li key={t.id}>{t.read ? "✅ " : ""}{t.title}</li>)}</ul>
        </section>
      )}
      {unit.words.length > 0 ? (
        <section className="settings-block">
          <h2>Слова · выучено {p.words.learned} из {p.words.total}</h2>
          <ul className="word-list">
            {unit.words.map((w) => (
              <li key={w.id}>
                <span>{w.learned ? "✅" : w.introduced ? "🆕" : "·"} <b>{w.stress ?? w.text}</b></span>
                <span className="hint">{w.meaning}</span>
              </li>
            ))}
          </ul>
          <p className="hint small">Новые слова приходят каждое утро по порядку юнитов; ✅ — выучено, 🆕 — учится сейчас.</p>
        </section>
      ) : (
        <p className="hint">Материалы этого юнита готовятся — они появятся с обновлением.</p>
      )}
      <div className="spacer" />
      {unit.words.length >= 4 && (
        <button className="button big" onClick={() => { haptic("tap"); setMode("check"); }}>
          Проверка юнита{p.check !== null ? ` (лучший результат ${p.check}%)` : ""}
        </button>
      )}
      {!p.complete && unit.words.length > 0 && (
        <button className="secondary center-text" disabled={busy} onClick={() => void known()}>
          {busy ? "Отмечаю…" : "Я это уже знаю"}
          <span className="hint small">слова юнита не придут как новые, правила отметятся пройденными</span>
        </button>
      )}
    </main>
  );
}

const shuffle = <T,>(xs: T[]): T[] => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/** Word → meaning, 4 options from the unit's own words; the score is saved, the best one counts. */
function UnitCheck({ unit, size, passPercent, done }: { unit: UnitDetail; size: number; passPercent: number; done: () => void }) {
  const questions = useMemo(() => {
    const pool = unit.words.filter((w) => w.meaning);
    return shuffle(pool).slice(0, size).map((w) => {
      const others = shuffle(pool.filter((o) => o.id !== w.id && o.meaning !== w.meaning)).slice(0, 3).map((o) => o.meaning);
      return { word: w, options: shuffle([w.meaning, ...others]) };
    });
  }, [unit, size]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const q = questions[i];
  const pick = (m: string) => {
    if (picked || !q) return;
    const ok = m === q.word.meaning;
    haptic(ok ? "done" : "tap");
    setPicked(m);
    const total = correct + (ok ? 1 : 0);
    setTimeout(async () => {
      setPicked(null);
      if (i + 1 < questions.length) {
        setCorrect(total);
        setI(i + 1);
      } else {
        setCorrect(total);
        setResult(await saveUnitCheck(unit.unit.id, total, questions.length).catch(() => ({ score: Math.round((total / questions.length) * 100), passed: false })));
      }
    }, ok ? 500 : 1200);
  };

  if (result) {
    return (
      <main className="screen center">
        <h1>{result.passed ? "Юнит пройден ✅" : `${result.score}%`}</h1>
        <p>{correct} из {questions.length} верно.{result.passed ? "" : ` Для зачёта нужно ${passPercent}% — повтори слова и попробуй снова.`}</p>
        <button className="button" onClick={done}>К юниту</button>
      </main>
    );
  }
  if (!q) return <main className="screen center hint">Мало слов для проверки.</main>;
  return (
    <main className="screen">
      <div className="top-line">
        <span className="hint small">Проверка юнита · {i + 1} из {questions.length}</span>
        <button className="link" onClick={done}>Прервать</button>
      </div>
      <div className="progress"><div className="bar" style={{ width: `${((i + 1) / questions.length) * 100}%` }} /></div>
      <div className="card"><span className="word">{q.word.stress ?? q.word.text}</span></div>
      <div className="answer">
        {q.options.map((m) => (
          <button
            key={m}
            className={`secondary center-text ${picked && m === q.word.meaning ? "right" : picked === m ? "wrong-pick" : ""}`}
            onClick={() => pick(m)}
          >
            {m}
          </button>
        ))}
      </div>
    </main>
  );
}

export const courseFeature: MiniFeature = { id: "course", HomeEntry, Screen };
