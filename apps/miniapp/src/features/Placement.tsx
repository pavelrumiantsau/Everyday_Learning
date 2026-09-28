// Placement test: mark upcoming Lithuanian words you already know, so lessons skip them;
// «Грамматика» tab: 2 exercises per upcoming lesson, both right → the lesson can be marked done (no cards).
import { grammarLabel, principalFormsLine } from "@el/core/labels";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getGrammarDiagnostic, getPlacement, markLessonDone, savePlacement, type DiagnosticLesson, type PlacementBatch } from "../api";
import { Play } from "../Audio";
import type { MiniFeature } from "../features";
import { haptic } from "../telegram";
import { ClozeBody, useClozeInput } from "./Grammar";

// Per-device flag only: hides the home entry once the words are done and the grammar check was run to the end.
const GRAMMAR_CHECKED = "placement-grammar-checked";
const grammarChecked = () => {
  try {
    return localStorage.getItem(GRAMMAR_CHECKED) === "1";
  } catch {
    return false;
  }
};
const setGrammarChecked = () => {
  try {
    localStorage.setItem(GRAMMAR_CHECKED, "1");
  } catch {
    // storage blocked: the entry just stays visible
  }
};

function HomeEntry({ open }: { open: () => void }) {
  const [placement, setPlacement] = useState<PlacementBatch | null>(null);
  useEffect(() => {
    getPlacement("lt").then(setPlacement, () => setPlacement(null));
  }, []);
  if (!placement) return null;
  if (placement.remaining === 0) {
    return grammarChecked() ? null : (
      <button className="secondary" onClick={open}>
        🇱🇹 Проверить, что я уже знаю
        <span className="hint small">грамматика: знакомые темы можно пропустить</span>
      </button>
    );
  }
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

function Screen({ close }: { close: () => void }) {
  const [tab, setTab] = useState<"words" | "grammar">("words");
  const tabs = (
    <div className="chips">
      <button className={`chip ${tab === "words" ? "on" : ""}`} onClick={() => setTab("words")}>Слова</button>
      <button className={`chip ${tab === "grammar" ? "on" : ""}`} onClick={() => setTab("grammar")}>Грамматика</button>
    </div>
  );
  return tab === "words" ? <Words close={close} tabs={tabs} /> : <GrammarCheck close={close} tabs={tabs} />;
}

function Words({ close: onDone, tabs }: { close: () => void; tabs: ReactNode }) {
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
  if (!item && batch.items.length === 0) {
    return (
      <main className="screen">
        {tabs}
        <p className="hint">Все слова проверены. Загляни во вкладку «Грамматика».</p>
        <div className="spacer" />
        <button className="secondary center-text" onClick={onDone}>На главную</button>
      </main>
    );
  }
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
      {index === 0 && tabs}
      <div className="progress">
        <div className="bar" style={{ width: `${(index / batch.items.length) * 100}%` }} />
      </div>
      <p className="hint small">
        🇱🇹 Знаешь это слово? {index + 1} / {batch.items.length}
      </p>
      <button className="card" onClick={() => setRevealed(true)} aria-disabled={revealed}>
        <span className="word">{item.stress ?? item.text}</span>
        {forms !== (item.stress ?? item.text) && <span className="gen">{forms.split(", ").slice(1).join(", ")}</span>}
        <span className="hint small">{grammarLabel(item)}</span>
        <Play id={item.id} kind="word" />
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

// --- grammar diagnostic ---

const STOP_AFTER_FAILS = 2; // two unknown topics in a row: the rest is probably new too

function DiagnosticQuestion({ lesson, index, onNext }: { lesson: DiagnosticLesson; index: number; onNext: (correct: boolean) => void }) {
  const ex = lesson.exercises[index]!;
  const state = useClozeInput(ex);
  return (
    <>
      <ClozeBody ex={ex} {...state} />
      <div className="spacer" />
      {state.result ? (
        <button className="button big" onClick={() => onNext(state.result === "correct")}>Дальше</button>
      ) : (
        <button className="button big" onClick={state.check} disabled={!state.value.trim()}>Проверить</button>
      )}
    </>
  );
}

function GrammarCheck({ close, tabs }: { close: () => void; tabs: ReactNode }) {
  const [lessons, setLessons] = useState<DiagnosticLesson[] | null>(null);
  const [pos, setPos] = useState(0); // lesson index
  const [ex, setEx] = useState(0); // exercise index within the lesson
  const [right, setRight] = useState(0);
  const [fails, setFails] = useState(0); // unknown topics in a row
  const [marked, setMarked] = useState(0);
  const [phase, setPhase] = useState<"ask" | "known" | "stop">("ask");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGrammarDiagnostic("lt").then((r) => setLessons(r.lessons), (e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось.</p>
        <p className="hint small">{error}</p>
        <button className="button" onClick={close}>На главную</button>
      </main>
    );
  }
  if (!lessons) return <main className="screen center hint">Загрузка…</main>;

  const lesson = lessons[pos];
  const nextLesson = (failed: boolean) => {
    const f = failed ? fails + 1 : 0;
    setFails(f);
    setEx(0);
    setRight(0);
    setPos(pos + 1);
    setPhase(failed && f >= STOP_AFTER_FAILS && pos + 1 < lessons.length ? "stop" : "ask");
  };

  if (!lesson || phase === "stop") {
    if (!lesson) setGrammarChecked();
    return (
      <main className="screen center">
        {tabs}
        <h1>📘 {marked > 0 ? `Пропускаем ${marked}` : "Готово"}</h1>
        <p className="hint">
          {marked > 0 ? `Отмечено как пройденные: ${marked}. ` : ""}
          {lesson
            ? "Две темы подряд оказались новыми — дальше, скорее всего, тоже новое. Эти правила придут по расписанию."
            : "Остальные правила придут по расписанию."}
        </p>
        {lesson && (
          <button className="button" onClick={() => setPhase("ask")}>Проверить дальше ({lessons.length - pos})</button>
        )}
        <button className="secondary center-text" onClick={close}>На главную</button>
      </main>
    );
  }

  if (phase === "known") {
    const mark = async () => {
      setBusy(true);
      try {
        await markLessonDone(lesson.id, { cards: false });
        haptic("done");
        setMarked(marked + 1);
        nextLesson(false);
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    };
    return (
      <main className="screen center">
        <h1>✓ 2 из 2</h1>
        <p>Похоже, тема «{lesson.title}» уже знакома.</p>
        <button className="button big" onClick={() => void mark()} disabled={busy}>
          {busy ? "Сохраняю…" : "Отметить урок как пройденный"}
        </button>
        <p className="hint small">Урок не придёт как правило дня, и его упражнения не попадут в повторения.</p>
        <button className="secondary center-text" onClick={() => nextLesson(false)}>Всё равно пройти по расписанию</button>
      </main>
    );
  }

  const answered = (correct: boolean) => {
    const r = right + (correct ? 1 : 0);
    if (ex + 1 < lesson.exercises.length) {
      setRight(r);
      setEx(ex + 1);
    } else if (r === lesson.exercises.length) setPhase("known");
    else nextLesson(true);
  };

  return (
    <main className="screen">
      {pos === 0 && ex === 0 && tabs}
      <div className="progress">
        <div className="bar" style={{ width: `${(pos / lessons.length) * 100}%` }} />
      </div>
      <p className="hint small">
        🇱🇹 📘 {lesson.title} · {lesson.cefr} · тема {pos + 1} / {lessons.length} · вопрос {ex + 1} / {lesson.exercises.length}
      </p>
      <DiagnosticQuestion key={`${lesson.id}:${ex}`} lesson={lesson} index={ex} onNext={answered} />
    </main>
  );
}

export const placementFeature: MiniFeature = { id: "placement", HomeEntry, Screen };
