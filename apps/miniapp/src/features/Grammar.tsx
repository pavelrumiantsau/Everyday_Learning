// Grammar: rule of the day (explanation → examples → exercises → "Готово"), and cloze cards in reviews.
import { checkAnswer, clozeParts, type AnswerResult } from "@el/core/grammar";
import type { Exercise, Lesson } from "@el/core";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { getGrammarToday, markLessonDone, type ClozeCard, type GrammarToday, type Rating } from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

const accepted = (ex: Exercise) => [ex.answer, ...(ex.also ?? [])];
const langOf = (lesson: Pick<Lesson, "id">) => lesson.id.slice(0, 2);

// --- markdown-light: **bold**, *italic*, "- " lists, blank line = new paragraph ---

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <b key={i}>{part.slice(2, -2)}</b>
    ) : part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
      <i key={i}>{part.slice(1, -1)}</i>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const intro = lines.filter((l) => !l.trimStart().startsWith("- "));
        const items = lines.filter((l) => l.trimStart().startsWith("- "));
        return (
          <Fragment key={i}>
            {intro.length > 0 && <p>{intro.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>}
            {items.length > 0 && <ul>{items.map((l, j) => <li key={j}>{inline(l.trimStart().slice(2))}</li>)}</ul>}
          </Fragment>
        );
      })}
    </>
  );
}

// --- one cloze exercise: sentence with a blank, typed answer, feedback ---

function Sentence({ ex, filled, result }: { ex: Exercise; filled?: string; result?: AnswerResult }) {
  const [before, after] = clozeParts(ex.text);
  return (
    <p className="cloze-sentence">
      {before}
      <span className={`blank ${result ?? ""}`}>{filled ?? "   "}</span>
      {after}
    </p>
  );
}

export function useClozeInput(ex: Exercise) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const check = () => {
    if (result || !value.trim()) return;
    const r = checkAnswer(value, accepted(ex));
    haptic(r === "correct" ? "done" : "tap");
    setResult(r);
  };
  return { value, setValue, result, check };
}

export function ClozeBody({ ex, value, setValue, result, check }: { ex: Exercise } & ReturnType<typeof useClozeInput>) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div className="card cloze">
      <Sentence ex={ex} filled={result ? ex.answer : undefined} result={result ?? undefined} />
      {ex.hint && <span className="hint small">({ex.hint})</span>}
      {!result ? (
        <input
          ref={input}
          className="answer-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Впиши пропущенное"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
        />
      ) : (
        <div className={`feedback ${result}`}>
          {result === "correct" && <b>✓ Верно</b>}
          {result === "almost" && <b>≈ Почти — проверь надстрочные знаки</b>}
          {result === "wrong" && <b>✗ Не совсем</b>}
          {result !== "correct" && (
            <span>
              Твой ответ: <s>{value.trim()}</s> · правильно: <b>{ex.answer}</b>
            </span>
          )}
          <span className="hint">{ex.translation}</span>
        </div>
      )}
    </div>
  );
}

// --- review queue: cloze card with the 4 ratings ---

const RATINGS: { rating: Rating; label: string; cls: string }[] = [
  { rating: 1, label: "Снова", cls: "again" },
  { rating: 2, label: "Трудно", cls: "hard" },
  { rating: 3, label: "Хорошо", cls: "good" },
  { rating: 4, label: "Легко", cls: "easy" },
];
const SUGGESTED: Record<AnswerResult, Rating> = { correct: 3, almost: 2, wrong: 1 };

export function ClozeReview({ card, position, progress, onAnswer }: { card: ClozeCard; position: string; progress: number; onAnswer: (r: Rating) => void }) {
  const state = useClozeInput(card.exercise);
  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="hint small">
        {FLAG[card.lang]} {position} · 📘 {card.lessonTitle}
      </p>
      <ClozeBody ex={card.exercise} {...state} />
      <div className="spacer" />
      {state.result ? (
        <div className="ratings">
          {RATINGS.map((r) => (
            <button key={r.rating} className={`rate ${r.cls} ${SUGGESTED[state.result!] === r.rating ? "suggested" : ""}`} onClick={() => onAnswer(r.rating)}>
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <button className="button big" onClick={state.check} disabled={!state.value.trim()}>
          Проверить
        </button>
      )}
    </main>
  );
}

// --- home entry ---

function HomeEntry({ open }: { open: () => void }) {
  const [today, setToday] = useState<GrammarToday | null>(null);
  useEffect(() => {
    getGrammarToday().then(setToday, () => setToday(null));
  }, []);
  const lesson = today?.lesson;
  if (!lesson) return null;
  return (
    <button className="secondary" onClick={open}>
      📘 Правило дня: {lesson.title}
      <span className="hint small">
        {today.done
          ? "✓ пройдено · упражнения придут в повторениях"
          : `${FLAG[langOf(lesson)] ?? ""} ${lesson.cefr} · ${lesson.exercises.length} упражнений · ~5 мин`}
      </span>
    </button>
  );
}

// --- lesson screen ---

function ExerciseStep({ lesson, index, onNext }: { lesson: Lesson; index: number; onNext: (correct: boolean) => void }) {
  const ex = lesson.exercises[index]!;
  const state = useClozeInput(ex);
  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / lesson.exercises.length) * 100}%` }} />
      </div>
      <p className="hint small">
        📘 {lesson.title} · упражнение {index + 1} / {lesson.exercises.length}
      </p>
      <ClozeBody ex={ex} {...state} />
      <div className="spacer" />
      {state.result ? (
        <button className="button big" onClick={() => onNext(state.result === "correct")}>
          Дальше
        </button>
      ) : (
        <button className="button big" onClick={state.check} disabled={!state.value.trim()}>
          Проверить
        </button>
      )}
    </main>
  );
}

function Exercises({ lesson, onFinish }: { lesson: Lesson; onFinish: (correct: number) => void }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const next = (ok: boolean) => {
    const total = correct + (ok ? 1 : 0);
    if (index + 1 >= lesson.exercises.length) return onFinish(total);
    setCorrect(total);
    setIndex(index + 1);
  };
  return <ExerciseStep key={index} lesson={lesson} index={index} onNext={next} />; // key: fresh input per exercise
}

function Screen({ close }: { close: () => void }) {
  const [today, setToday] = useState<GrammarToday | null>(null);
  const [step, setStep] = useState<"read" | "practice" | "finish">("read");
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGrammarToday().then(setToday, (e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось загрузить правило.</p>
        <p className="hint small">{error}</p>
        <button className="button" onClick={close}>На главную</button>
      </main>
    );
  }
  if (!today) return <main className="screen center hint">Загрузка…</main>;
  const lesson = today.lesson;
  if (!lesson) {
    return (
      <main className="screen center">
        <h1>📘</h1>
        <p className="hint">Сегодня правила нет — воскресенье для чтения и письма. Или напиши боту /rule.</p>
        <button className="button" onClick={close}>На главную</button>
      </main>
    );
  }

  if (step === "practice") {
    return <Exercises lesson={lesson} onFinish={(c) => (setScore(c), setStep("finish"))} />;
  }

  if (step === "finish") {
    const finish = async () => {
      setSaving(true);
      try {
        await markLessonDone(lesson.id);
        haptic("done");
        close();
      } catch (e) {
        setError(String(e));
      }
    };
    return (
      <main className="screen center">
        <h1>{score} из {lesson.exercises.length}</h1>
        <p className="hint">Упражнения этого правила будут приходить в обычных повторениях.</p>
        <button className="button big" onClick={() => void finish()} disabled={saving}>
          {saving ? "Сохраняю…" : "Готово"}
        </button>
        <button className="secondary center-text" onClick={() => setStep("practice")}>Пройти ещё раз</button>
      </main>
    );
  }

  const lang = langOf(lesson);
  const explanation = lang === "lt" ? lesson.explanation.ru : lesson.explanation.en;
  const comparison = lang === "lt" ? lesson.comparison?.ru : lesson.comparison?.en;
  return (
    <main className="screen lesson">
      <p className="hint small">
        {FLAG[lang]} {lesson.cefr} · правило дня{today.done ? " · ✓ пройдено" : ""}
      </p>
      <h1>{lesson.title}</h1>
      <section className="lesson-text">
        <Markdown text={explanation ?? ""} />
      </section>
      {comparison && (
        <section className="note compare">
          <Markdown text={comparison} />
        </section>
      )}
      <h2>Примеры</h2>
      <ul className="examples">
        {lesson.examples.map((e, i) => (
          <li key={i}>
            <i>{e.text}</i>
            <span className="hint">{e.translation}</span>
          </li>
        ))}
      </ul>
      <div className="spacer" />
      <button className="button big" onClick={() => setStep("practice")}>
        К упражнениям ({lesson.exercises.length})
      </button>
    </main>
  );
}

export const grammarFeature: MiniFeature = { id: "grammar", HomeEntry, Screen };
