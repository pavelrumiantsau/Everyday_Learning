// Grammar: rule of the day (explanation → examples → exercises → "Готово"), cloze cards in reviews, and
// «📚 Пройденные правила» — every rule seen so far, to read again and redo its exercises.
import { lessonAudioId } from "@el/core/audio";
import { checkAnswer, clozeParts, exerciseCardId, parseExerciseCardId, type AnswerResult } from "@el/core/grammar";
import type { Exercise, Lesson } from "@el/core";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  activeLangs,
  getGrammarHistory,
  getGrammarToday,
  getLesson,
  getNextLesson,
  markLessonDone,
  recordReview,
  type ClozeCard,
  type GrammarToday,
  type Lang,
  type Rating,
  type SeenLesson,
} from "../api";
import type { MiniFeature } from "../features";
import { Play } from "../Audio";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

const accepted = (ex: Exercise) => [ex.answer, ...(ex.also ?? [])];
const langOf = (lesson: Pick<Lesson, "id">) => lesson.id.slice(0, 2);

// --- markdown-light: **bold**, *italic*, ***both***, one level of nesting (*a **b** c*, **a *b* c**), ~~wrong~~, "- " lists,
// blank line = new paragraph ---

const INLINE = /(~~[^~]+~~|\*\*\*[^*]+\*\*\*|\*\*(?!\*)(?:[^*]|\*[^*]+\*)+\*\*|\*(?:[^*]|\*\*[^*]+\*\*)+\*)/g;
const BOTH = /^\*\*\*[^*]+\*\*\*$/;
const BOLD = /^\*\*(?!\*)(?:[^*]|\*[^*]+\*)+\*\*$/;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) =>
    /^~~[^~]+~~$/.test(part) ? (
      <s key={i}>{part.slice(2, -2)}</s>
    ) : BOTH.test(part) ? (
      <b key={i}><i>{part.slice(3, -3)}</i></b>
    ) : BOLD.test(part) ? (
      <b key={i}>{inline(part.slice(2, -2))}</b>
    ) : part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
      <i key={i}>{inline(part.slice(1, -1))}</i>
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

/** 🔊 of an exercise sentence (blank filled in). French lessons are dictation, so there it plays before answering. */
function exerciseAudio(lessonId: string, index: number) {
  return { audioId: lessonAudioId(lessonId, "x", index), audioFirst: lessonId.startsWith("fr-") };
}

export function ClozeBody({ ex, value, setValue, result, check, audioId, audioFirst }: { ex: Exercise; audioId?: string; audioFirst?: boolean } & ReturnType<typeof useClozeInput>) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div className="card cloze">
      {audioId && (audioFirst || result) && <Play id={audioId} kind="word" />}
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
  const ref = parseExerciseCardId(card.cardId);
  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="hint small">
        {FLAG[card.lang]} {position} · 📘 {card.lessonTitle}
      </p>
      <ClozeBody ex={card.exercise} {...state} {...(ref && exerciseAudio(ref.lessonId, ref.index))} />
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
  if (!today) return null;
  if (!lesson) {
    // Thursday / Sunday: no rule in the rotation, but an extra one can still be taken.
    return (
      <button className="secondary" onClick={open}>
        📘 Правило вне расписания
        <span className="hint small">сегодня правила нет — можно взять следующее</span>
      </button>
    );
  }
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

/** `record`: the lesson is done, so its exercises are review cards — an answer here counts as their review (a miss comes back soon). */
function ExerciseStep({ lesson, index, record, onNext }: { lesson: Lesson; index: number; record: boolean; onNext: (correct: boolean) => void }) {
  const ex = lesson.exercises[index]!;
  const state = useClozeInput(ex);
  const next = () => {
    if (record && state.result) recordReview(exerciseCardId(lesson.id, index), SUGGESTED[state.result]);
    onNext(state.result === "correct");
  };
  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / lesson.exercises.length) * 100}%` }} />
      </div>
      <p className="hint small">
        📘 {lesson.title} · упражнение {index + 1} / {lesson.exercises.length}
      </p>
      <ClozeBody ex={ex} {...state} {...exerciseAudio(lesson.id, index)} />
      <div className="spacer" />
      {state.result ? (
        <button className="button big" onClick={next}>
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

function Exercises({ lesson, record, onFinish }: { lesson: Lesson; record: boolean; onFinish: (correct: number) => void }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const next = (ok: boolean) => {
    const total = correct + (ok ? 1 : 0);
    if (index + 1 >= lesson.exercises.length) return onFinish(total);
    setCorrect(total);
    setIndex(index + 1);
  };
  return <ExerciseStep key={index} lesson={lesson} index={index} record={record} onNext={next} />; // key: fresh input per exercise
}

/** «Ещё одно правило»: the next lesson ahead of the rotation, for days with more time. */
function NextRule({ onPick }: { onPick: (lesson: Lesson) => void }) {
  const [busy, setBusy] = useState(false);
  const [none, setNone] = useState<string | null>(null);
  const pick = async (lang?: Lang) => {
    setBusy(true);
    try {
      const { lesson } = await getNextLesson(lang);
      if (lesson) onPick(lesson);
      else setNone(lang ? `${FLAG[lang]} — больше правил нет.` : "Больше правил нет.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className="secondary center-text" onClick={() => void pick()} disabled={busy}>
        ➕ Следующее правило
      </button>
      <p className="hint small center-text">
        или язык:{" "}
        {activeLangs().map((l) => (
          <button key={l} className="link" onClick={() => void pick(l)} disabled={busy}>
            {FLAG[l]}
          </button>
        ))}
      </p>
      {none && <p className="hint small center-text">{none}</p>}
    </>
  );
}

interface Current extends GrammarToday {
  extra: boolean; // opened ahead of the rotation, not the rule of the day
  repeat?: boolean; // opened from «📚 Пройденные правила»
}

const LANG_FILTERS: (Lang | "all")[] = ["all", "lt", "es", "fr"];
const formatDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

/** «📚 Пройденные правила»: rules seen so far, newest first, by language and with search; tap one to read it again. */
function History({ onOpen, onBack }: { onOpen: (id: string) => void; onBack: () => void }) {
  const [lessons, setLessons] = useState<SeenLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang | "all">("all");
  const [query, setQuery] = useState("");
  useEffect(() => {
    getGrammarHistory().then(setLessons, (e) => setError(String(e)));
  }, []);
  const langs = useMemo(() => new Set(lessons?.map((l) => l.lang)), [lessons]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (lessons ?? []).filter((l) => (lang === "all" || l.lang === lang) && (!q || l.title.toLowerCase().includes(q)));
  }, [lessons, lang, query]);

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось загрузить список.</p>
        <p className="hint small">{error}</p>
        <button className="button" onClick={onBack}>Назад</button>
      </main>
    );
  }
  if (!lessons) return <main className="screen center hint">Загрузка…</main>;
  return (
    <main className="screen">
      <h1>📚 Пройденные правила</h1>
      {lessons.length === 0 ? (
        <p className="hint">Пока ни одного — первое правило придёт утром.</p>
      ) : (
        <>
          <p className="hint small">Открой правило, чтобы перечитать объяснение и снова сделать упражнения.</p>
          {langs.size > 1 && (
            <div className="chips">
              {LANG_FILTERS.filter((l) => l === "all" || langs.has(l)).map((l) => (
                <button key={l} className={`chip ${lang === l ? "on" : ""}`} onClick={() => setLang(l)}>
                  {l === "all" ? "Все" : FLAG[l]}
                </button>
              ))}
            </div>
          )}
          {lessons.length > 8 && (
            <input className="text-input" placeholder="Поиск по названию" value={query} onChange={(e) => setQuery(e.target.value)} />
          )}
          {shown.map((l) => (
            <button key={l.id} className="secondary" onClick={() => { haptic("tap"); onOpen(l.id); }}>
              {l.title}
              <span className="hint small">
                {FLAG[l.lang]} {l.cefr} · {formatDay(l.day)} · {l.exercises} упражнений{l.done ? "" : " · не отмечено «Готово»"}
              </span>
            </button>
          ))}
          {shown.length === 0 && <p className="hint">Ничего не найдено.</p>}
        </>
      )}
      <div className="spacer" />
      <button className="secondary center-text" onClick={onBack}>Назад</button>
    </main>
  );
}

function Screen({ close, startWithList = false }: { close: () => void; startWithList?: boolean }) {
  const [today, setCurrent] = useState<Current | null>(null);
  const [list, setList] = useState(startWithList);
  const [step, setStep] = useState<"read" | "practice" | "finish">("read");
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startWithList) return;
    // Deep link from /rule next: ?screen=grammar&lesson=lt-g-0050 (removed from the URL so it opens only once).
    const params = new URLSearchParams(location.search);
    const id = params.get("lesson");
    if (id) {
      params.delete("lesson");
      history.replaceState(null, "", `${location.pathname}?${params}`);
      getLesson(id).then((r) => setCurrent({ day: "", lesson: r.lesson, done: r.done, extra: true }), (e) => setError(String(e)));
      return;
    }
    getGrammarToday().then((t) => setCurrent({ ...t, extra: false }), (e) => setError(String(e)));
  }, [startWithList]);

  const show = (current: Current) => {
    setCurrent(current);
    setStep("read");
    setSaved(false);
    setList(false);
    window.scrollTo(0, 0);
  };
  const openExtra = (lesson: Lesson) => show({ day: today?.day ?? "", lesson, done: false, extra: true });
  const openSeen = (id: string) => {
    setCurrent(null);
    setList(false);
    getLesson(id).then((r) => show({ day: "", lesson: r.lesson, done: r.done, extra: true, repeat: true }), (e) => setError(String(e)));
  };
  const openList = () => {
    setList(true);
    window.scrollTo(0, 0);
  };
  // From a repeated rule, «назад» goes to the list; from the list, to wherever it was opened from.
  const back = today?.repeat ? openList : close;

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось загрузить правило.</p>
        <p className="hint small">{error}</p>
        <button className="button" onClick={close}>На главную</button>
      </main>
    );
  }
  if (list) return <History onOpen={openSeen} onBack={startWithList || !today ? close : () => setList(false)} />;
  if (!today) return <main className="screen center hint">Загрузка…</main>;
  const lesson = today.lesson;
  const HistoryLink = () => (
    <button className="secondary center-text" onClick={openList}>📚 Пройденные правила</button>
  );
  if (!lesson) {
    return (
      <main className="screen center">
        <h1>📘</h1>
        <p className="hint">Сегодня правила нет — день для чтения и письма. Если есть время, можно взять следующее:</p>
        <NextRule onPick={openExtra} />
        <HistoryLink />
        <button className="button" onClick={close}>На главную</button>
      </main>
    );
  }

  if (step === "practice") {
    return <Exercises lesson={lesson} record={today.done} onFinish={(c) => (setScore(c), setStep("finish"))} />;
  }

  if (step === "finish") {
    const finish = async () => {
      setSaving(true);
      try {
        await markLessonDone(lesson.id);
        haptic("done");
        setSaved(true);
      } catch (e) {
        setError(String(e));
      } finally {
        setSaving(false);
      }
    };
    if (today.done) {
      // A repeat (or today's rule again): already saved, answers went to the exercises' reviews.
      return (
        <main className="screen center">
          <h1>{score} из {lesson.exercises.length}</h1>
          <p className="hint">
            {score === lesson.exercises.length
              ? "Всё верно 🎉"
              : "Упражнения с ошибками придут в повторениях пораньше."}
          </p>
          <button className="button big" onClick={() => setStep("practice")}>Пройти ещё раз</button>
          {today.repeat ? <HistoryLink /> : <button className="secondary center-text" onClick={close}>На главную</button>}
        </main>
      );
    }
    if (saved) {
      return (
        <main className="screen center">
          <h1>✓</h1>
          <p className="hint">Сохранено. Упражнения этого правила будут приходить в обычных повторениях.</p>
          <button className="button big" onClick={today.repeat ? openList : close}>{today.repeat ? "К списку правил" : "На главную"}</button>
          {!today.repeat && <NextRule onPick={openExtra} />}
        </main>
      );
    }
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
  const label = today.repeat ? "повторение" : today.extra ? "дополнительное правило" : "правило дня";
  return (
    <main className="screen lesson">
      <p className="hint small">
        {FLAG[lang]} {lesson.cefr} · {label}{today.done ? " · ✓ пройдено" : ""}
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
            <span>
              <i>{e.text}</i> <Play id={lessonAudioId(lesson.id, "e", i)} kind="word" small />
            </span>
            <span className="hint">{e.translation}</span>
          </li>
        ))}
      </ul>
      <div className="spacer" />
      <button className="button big" onClick={() => setStep("practice")}>
        К упражнениям ({lesson.exercises.length})
      </button>
      {today.repeat ? (
        <button className="secondary center-text" onClick={back}>← К списку правил</button>
      ) : (
        <>
          {today.done && <NextRule onPick={openExtra} />}
          <HistoryLink />
        </>
      )}
    </main>
  );
}

export const grammarFeature: MiniFeature = { id: "grammar", HomeEntry, Screen };

/** Home: «📚 Пройденные правила» — shown once there is at least one rule to go back to. */
function HistoryEntry({ open }: { open: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    getGrammarHistory().then((l) => setCount(l.length), () => setCount(0));
  }, []);
  if (!count) return null;
  return (
    <button className="secondary" onClick={open}>
      📚 Пройденные правила ({count})
      <span className="hint small">перечитать объяснение и снова сделать упражнения</span>
    </button>
  );
}

export const grammarHistoryFeature: MiniFeature = {
  id: "grammar-history",
  HomeEntry: HistoryEntry,
  Screen: ({ close }) => <Screen close={close} startWithList />,
};
