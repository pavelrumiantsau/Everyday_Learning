// 🇺🇦 Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md §4): course map → block (rule, practice, mistakes),
// a mistakes queue of its own and a diagnostic per part. Shown only on the owner's bot (the API answers 404 in copies).
// Answers go to /api/uk/answers only — never to the normal reviews.
import type { UkBlock, UkExercise } from "@el/core";
import { BLANK, clozeParts } from "@el/core/grammar";
import { checkUk, PART_TEST_PASS, PART_TEST_SIZE, tokens, vowelPositions } from "@el/core/uk";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  flushUkAnswers,
  getUkBlock,
  getUkDiagnostic,
  getUkMap,
  getUkReview,
  markUkBlockKnown,
  openUkBlock,
  recordUkAnswer,
  saveUkDiagnostic,
  getUkCheatsheet,
  getUkPartTest,
  saveUkPartTest,
  searchUk,
  type UkBlockDetail,
  type UkBlockSummary,
  type UkCheatRule,
  type UkDiagnostic,
  type UkItem,
  type UkMap,
  type UkMode,
} from "../api";
import type { MiniFeature } from "../features";
import { ReportButton } from "../ReportButton";
import { haptic } from "../telegram";
import { Markdown } from "./Grammar";

const STATUS: Record<UkBlockSummary["status"], string> = { closed: "не открыт", known: "✓ знаю", open: "в работе", mastered: "✓ освоен" };
const blockOf = (exerciseId: string) => exerciseId.split(":")[0]!;

/** The word with its stressed vowel marked: "кропива", 3 → "кропива́". */
function stressed(word: string, n: number): string {
  const pos = vowelPositions(word)[n - 1];
  const chars = [...word];
  return pos === undefined ? word : [...chars.slice(0, pos + 1), "́", ...chars.slice(pos + 1)].join("");
}

/** The right answer, as shown after a wrong one. */
function rightAnswer(ex: UkExercise): string {
  switch (ex.type) {
    case "cloze":
      return ex.text.replace(BLANK, ex.answer);
    case "choice":
      return ex.text.includes(BLANK) ? ex.text.replace(BLANK, ex.options[ex.answer]!) : ex.options[ex.answer]!;
    case "fix":
      return ex.answer;
    case "spot":
      return tokens(ex.text)
        .map((t) => (t.word === ex.wrong ? t.shown.replace(ex.wrong, ex.answer) : t.shown))
        .join(" ");
    case "judge":
      return ex.correct ? "Предложение верное" : ex.fix!;
    case "stress":
      return stressed(ex.word, ex.answer);
  }
}

const PROMPT: Record<UkExercise["type"], string> = {
  cloze: "Впиши пропущенное",
  choice: "Выбери правильный вариант",
  fix: "Исправь предложение",
  spot: "Найди ошибку: нажми на неверное слово",
  judge: "Верно или есть ошибка?",
  stress: "Где ударение? Нажми на ударную гласную",
};

// --- one exercise ---

function Sentence({ text, filled, ok }: { text: string; filled?: string; ok?: boolean }) {
  if (!text.includes(BLANK)) return <p className="cloze-sentence">{text}</p>;
  const [before, after] = clozeParts(text);
  return (
    <p className="cloze-sentence">
      {before}
      <span className={`blank ${ok === undefined ? "" : ok ? "correct" : "wrong"}`}>{filled ?? "   "}</span>
      {after}
    </p>
  );
}

function TextAnswer({ placeholder, initial = "", onCheck }: { placeholder: string; initial?: string; onCheck: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <>
      <input
        ref={input}
        className="answer-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && onCheck(value)}
        placeholder={placeholder}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
      />
      <button className="button" onClick={() => onCheck(value)} disabled={!value.trim()}>
        Проверить
      </button>
    </>
  );
}

/** Shows one exercise; reports the result once (`onAnswer`) and then shows the feedback with the explanation. */
function Exercise({ item, onAnswer }: { item: UkItem; onAnswer: (correct: boolean) => void }) {
  const ex = item.exercise;
  const [result, setResult] = useState<{ ok: boolean; given?: string } | null>(null);
  const [spotted, setSpotted] = useState<number | null>(null);
  const answer = (ok: boolean, given?: string) => {
    if (result) return;
    haptic(ok ? "done" : "tap");
    setResult({ ok, given });
    onAnswer(ok);
  };

  let body;
  switch (ex.type) {
    case "cloze":
      body = (
        <>
          <Sentence text={ex.text} filled={result ? ex.answer : undefined} ok={result?.ok} />
          {ex.hint && <span className="hint small">({ex.hint})</span>}
          {!result && <TextAnswer placeholder="Впиши пропущенное" onCheck={(v) => answer(checkUk(v, [ex.answer, ...(ex.also ?? [])]), v.trim())} />}
        </>
      );
      break;
    case "choice":
      body = (
        <>
          <Sentence text={ex.text} filled={result ? ex.options[ex.answer] : undefined} ok={result?.ok} />
          <div className="chips">
            {ex.options.map((o, i) => (
              <button
                key={o}
                className={`chip ${result && i === ex.answer ? "right" : ""} ${result && !result.ok && result.given === o ? "wrong" : ""}`}
                disabled={!!result}
                onClick={() => answer(i === ex.answer, o)}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      );
      break;
    case "fix":
      body = (
        <>
          <p className="cloze-sentence">{ex.text}</p>
          {!result && <TextAnswer placeholder="Напиши правильно" initial={ex.text} onCheck={(v) => answer(checkUk(v, [ex.answer, ...(ex.also ?? [])]), v.trim())} />}
        </>
      );
      break;
    case "spot": {
      const words = tokens(ex.text);
      body = (
        <>
          <div className="chips">
            {words.map((t, i) => (
              <button
                key={i}
                className={`chip ${spotted === i ? (t.word === ex.wrong ? "right" : "wrong") : ""} ${result && t.word === ex.wrong ? "wrong" : ""}`}
                disabled={!!result || spotted !== null}
                onClick={() => {
                  setSpotted(i);
                  if (t.word !== ex.wrong) answer(false, t.word);
                }}
              >
                {t.shown}
              </button>
            ))}
          </div>
          {!result && spotted !== null && (
            <TextAnswer placeholder={`Вместо «${ex.wrong}»`} onCheck={(v) => answer(checkUk(v, [ex.answer, ...(ex.also ?? [])]), v.trim())} />
          )}
        </>
      );
      break;
    }
    case "judge":
      body = (
        <>
          <p className="cloze-sentence">{ex.text}</p>
          {!result && (
            <div className="row-buttons">
              <button className="button" onClick={() => answer(ex.correct)}>✓ Верно</button>
              <button className="button" onClick={() => answer(!ex.correct)}>✗ Есть ошибка</button>
            </div>
          )}
        </>
      );
      break;
    case "stress": {
      const vowels = vowelPositions(ex.word);
      body = (
        <p className="uk-stress">
          {[...ex.word].map((ch, i) => {
            const n = vowels.indexOf(i);
            if (n < 0) return <span key={i}>{ch}</span>;
            const right = n + 1 === ex.answer;
            return (
              <button key={i} className={`uk-vowel ${result && right ? "right" : ""}`} disabled={!!result} onClick={() => answer(right, String(n + 1))}>
                {ch}
              </button>
            );
          })}
        </p>
      );
      break;
    }
  }

  return (
    <div className="card cloze">
      <span className="hint small">{PROMPT[ex.type]}</span>
      {body}
      {result && (
        <div className={`feedback ${result.ok ? "correct" : "wrong"}`}>
          <b>{result.ok ? "✓ Верно" : "✗ Неверно"}</b>
          {(!result.ok || ex.type === "judge" || ex.type === "stress") && <span>Правильно: <b>{rightAnswer(ex)}</b></span>}
          <span className="hint">{ex.explain}</span>
          <ReportButton itemId={blockOf(item.id)} cardId={item.id} />
        </div>
      )}
    </div>
  );
}

// --- a run of exercises (practice, mistakes, diagnostic) ---

/** `retry`: exercises answered wrong come back once at the end (practice only). */
function Run({ items, mode, title, retry, onFinish }: { items: UkItem[]; mode: UkMode; title: string; retry: boolean; onFinish: (results: { id: string; correct: boolean }[]) => void }) {
  const [queue, setQueue] = useState(items);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const item = queue[index]!;
  const retried = index >= items.length;
  const onAnswer = (correct: boolean) => {
    setAnswered(correct);
    recordUkAnswer(item.id, correct, mode);
    if (!retried) setResults((r) => [...r, { id: item.id, correct }]);
    if (!correct && retry && !retried) setQueue((q) => [...q, item]);
  };
  const next = () => {
    if (index + 1 >= queue.length) return onFinish(results);
    setIndex(index + 1);
    setAnswered(null);
    window.scrollTo(0, 0);
  };
  return (
    <main className="screen">
      <div className="progress">
        <div className="bar" style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <p className="hint small">
        🇺🇦 {item.blockTitle ?? title} · {index + 1} / {queue.length}
        {retried ? " · ещё раз" : ""}
      </p>
      <Exercise key={index} item={item} onAnswer={onAnswer} />
      <div className="spacer" />
      {answered !== null && (
        <button className="button big" onClick={next}>
          Дальше
        </button>
      )}
    </main>
  );
}

// --- block screen ---

function RuleView({ block }: { block: UkBlock }) {
  return (
    <>
      <section className="lesson-text">
        <Markdown text={block.rule} />
      </section>
      {block.tables.map((t, i) => (
        <div key={i} className="uk-table-wrap">
          {t.caption && <p className="hint small">{t.caption}</p>}
          <table className="uk-table">
            <thead>
              <tr>{t.head.map((h, j) => <th key={j}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {t.rows.map((r, j) => (
                <tr key={j}>{r.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {block.pairs.length > 0 && (
        <>
          <h2>Типичные ошибки</h2>
          <ul className="examples">
            {block.pairs.map((p, i) => (
              <li key={i}>
                <span><s className="hint">{p.wrong}</s> → <b>{p.right}</b></span>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2>Примеры</h2>
      <ul className="examples">
        {block.examples.map((e, i) => (
          <li key={i}>
            <i>{e.text}</i>
            {e.note && <span className="hint">{e.note}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}

function BlockScreen({ id, onBack, onRun }: { id: string; onBack: () => void; onRun: (items: UkItem[], title: string) => void }) {
  const [detail, setDetail] = useState<UkBlockDetail | null>(null);
  const [tab, setTab] = useState<"rule" | "mistakes">("rule");
  const [error, setError] = useState<string | null>(null);
  // Answers still on the device go first, so progress, «Мои ошибки» and the next session include them.
  const load = useCallback(() => flushUkAnswers().then(() => getUkBlock(id)).then(setDetail, (e) => setError(String(e))), [id]);
  useEffect(() => void load(), [load]);

  if (error) return <Failure error={error} onBack={onBack} />;
  if (!detail) return <main className="screen center hint">Загрузка…</main>;
  const { block, progress } = detail;
  const item = (i: number): UkItem => ({ id: `${block.id}:x${i + 1}`, exercise: block.exercises[i]! });
  const practise = async () => {
    haptic("tap");
    if (progress.status === "closed" || progress.status === "known") await openUkBlock(block.id).catch(() => undefined);
    onRun(detail.session.map(item), block.title);
  };
  const known = async () => {
    haptic("tap");
    try {
      await markUkBlockKnown(block.id);
      onBack();
    } catch (e) {
      setError(String(e));
    }
  };
  const share = progress.recent === null ? "" : ` · верно ${Math.round(progress.recent * 100)} % из последних`;
  return (
    <main className="screen lesson">
      <p className="hint small">
        🇺🇦 {block.source} · {block.level} · {STATUS[progress.status]} · {progress.answered} / {block.exercises.length} упражнений{share}
      </p>
      <h1>{block.title}</h1>
      <div className="chips">
        <button className={`chip ${tab === "rule" ? "on" : ""}`} onClick={() => setTab("rule")}>Правило</button>
        <button className={`chip ${tab === "mistakes" ? "on" : ""}`} onClick={() => setTab("mistakes")}>Мои ошибки ({detail.wrong.length})</button>
      </div>
      {tab === "rule" ? (
        <RuleView block={block} />
      ) : detail.wrong.length === 0 ? (
        <p className="hint">Ошибок пока нет: здесь появятся упражнения, в которых последний ответ был неверным.</p>
      ) : (
        <>
          <ul className="examples">
            {detail.wrong.map((i) => (
              <li key={i}>
                <span>{rightAnswer(block.exercises[i]!)}</span>
                <span className="hint">{block.exercises[i]!.explain}</span>
              </li>
            ))}
          </ul>
          <button className="secondary center-text" onClick={() => onRun(detail.wrong.map(item), block.title)}>
            Пройти их ещё раз ({detail.wrong.length})
          </button>
        </>
      )}
      <div className="spacer" />
      <button className="button big" onClick={() => void practise()}>
        {progress.status === "closed" ? "Открыть блок и начать" : `Тренировка (${detail.session.length})`}
      </button>
      {progress.status === "closed" && (
        <button className="secondary center-text" onClick={() => void known()}>
          Я это знаю — пропустить
        </button>
      )}
      <button className="secondary center-text" onClick={onBack}>← К карте курса</button>
    </main>
  );
}

// --- diagnostic ---

function DiagnosticPicker({ map, onPick, onBack }: { map: UkMap; onPick: (part: number) => void; onBack: () => void }) {
  return (
    <main className="screen">
      <h1>🧭 Диагностика</h1>
      <p className="hint">
        По 2 задания на каждый блок, одна часть за раз. Оба верно — блок отмечается «знаю» (его всё равно можно открыть), иначе он остаётся
        рекомендованным.
      </p>
      {map.parts
        .filter((p) => p.blocks.length > 0)
        .map((p) => {
          const left = p.blocks.filter((b) => b.diag === null).length;
          return (
            <button key={p.part} className="secondary" onClick={() => onPick(p.part)}>
              {p.part}. {p.title}
              <span className="hint small">{left ? `не проверено блоков: ${left} · заданий: ${p.blocks.length * 2}` : "✓ проверено — можно пройти ещё раз"}</span>
            </button>
          );
        })}
      <div className="spacer" />
      <button className="secondary center-text" onClick={onBack}>← К карте курса</button>
    </main>
  );
}

function DiagnosticRun({ part, onDone }: { part: number; onDone: () => void }) {
  const [diag, setDiag] = useState<UkDiagnostic | null>(null);
  const [summary, setSummary] = useState<{ title: string; correct: number; total: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getUkDiagnostic(part).then(setDiag, (e) => setError(String(e)));
  }, [part]);
  if (error) return <Failure error={error} onBack={onDone} />;
  if (!diag) return <main className="screen center hint">Загрузка…</main>;
  if (summary) {
    return (
      <main className="screen">
        <h1>🧭 {diag.part}. {diag.title}</h1>
        <ul className="examples">
          {summary.map((s) => (
            <li key={s.title}>
              <span>{s.title}</span>
              <span className="hint">{s.correct === s.total ? "✓ знаю — блок можно пропустить" : `${s.correct} из ${s.total} · рекомендован`}</span>
            </li>
          ))}
        </ul>
        <div className="spacer" />
        <button className="button big" onClick={onDone}>К карте курса</button>
      </main>
    );
  }
  const items = diag.blocks.flatMap((b) => b.exercises.map((e) => ({ ...e, blockTitle: b.title })));
  const finish = async (results: { id: string; correct: boolean }[]) => {
    const perBlock = diag.blocks.map((b) => ({ block: b.id, title: b.title, total: b.exercises.length, correct: results.filter((r) => blockOf(r.id) === b.id && r.correct).length }));
    await flushUkAnswers();
    try {
      await saveUkDiagnostic(perBlock.map(({ block, correct }) => ({ block, correct })));
      setSummary(perBlock);
    } catch (e) {
      setError(String(e));
    }
  };
  return <Run items={items} mode="diag" title="Диагностика" retry={false} onFinish={(r) => void finish(r)} />;
}

// --- course map ---

function Failure({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <main className="screen center">
      <p>Не получилось загрузить.</p>
      <p className="hint small">{error}</p>
      <button className="button" onClick={onBack}>Назад</button>
    </main>
  );
}

// --- part test ---

function PartTest({ part, onDone }: { part: number; onDone: () => void }) {
  const [test, setTest] = useState<{ title: string; items: UkItem[] } | null>(null);
  const [result, setResult] = useState<{ correct: number; total: number; score: number; passed: boolean; best: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getUkPartTest(part).then(setTest, (e) => setError(String(e)));
  }, [part]);
  if (error) return <Failure error={error} onBack={onDone} />;
  if (!test) return <main className="screen center hint">Загрузка…</main>;
  if (result) {
    return (
      <main className="screen center">
        <h1>{result.score} %</h1>
        <p>{result.correct} из {result.total}</p>
        <p className="hint">
          {result.passed ? `✓ Часть ${part} пройдена 🎉` : `Нужно ${Math.round(PART_TEST_PASS * 100)} % — ошибки вернутся в «Повторить ошибки».`}
          {result.best > result.score ? ` Лучший результат: ${result.best} %.` : ""}
        </p>
        <button className="button big" onClick={onDone}>К карте курса</button>
      </main>
    );
  }
  const finish = async (results: { id: string; correct: boolean }[]) => {
    const correct = results.filter((r) => r.correct).length;
    await flushUkAnswers();
    try {
      const r = await saveUkPartTest(part, correct, results.length);
      setResult({ correct, total: results.length, ...r });
    } catch (e) {
      setError(String(e));
    }
  };
  return <Run items={test.items} mode="test" title={`Контрольная: ${test.title}`} retry={false} onFinish={(r) => void finish(r)} />;
}

// --- cheat sheet ---

function CheatSheet({ onBlock, onBack }: { onBlock: (id: string) => void; onBack: () => void }) {
  const [rules, setRules] = useState<UkCheatRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getUkCheatsheet().then(setRules, (e) => setError(String(e)));
  }, []);
  if (error) return <Failure error={error} onBack={onBack} />;
  if (!rules) return <main className="screen center hint">Загрузка…</main>;
  return (
    <main className="screen">
      <h1>📋 Шпаргалка</h1>
      <p className="hint small">15 правил, которые дают больше всего (приложение А курса). Нажмите на блок, чтобы открыть правило.</p>
      <ol className="summary-list">
        {rules.map((r, i) => (
          <li key={i}>
            <b>{r.rule}</b>
            <br />
            <i>{r.example}</i>
            <div className="chips">
              {r.blocks.map((b) => (
                <button key={b.id} className="chip" onClick={() => { haptic("tap"); onBlock(b.id); }}>
                  {b.title}
                  {b.status === "mastered" || b.status === "known" ? " ✓" : ""}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="spacer" />
      <button className="secondary center-text" onClick={onBack}>← К карте курса</button>
    </main>
  );
}

// --- search ---

function Search({ onBlock }: { onBlock: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ id: string; title: string; part: number; source: string }[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setFound(null);
    const timer = setTimeout(() => {
      searchUk(q).then(setFound, () => setFound([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <>
      <input className="text-input" placeholder="Поиск по правилам: -ові, пів, чи, кличний…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {found && found.length === 0 && <p className="hint small">Ничего не найдено.</p>}
      {found?.map((b) => (
        <button key={b.id} className="secondary" onClick={() => { haptic("tap"); onBlock(b.id); }}>
          {b.title}
          <span className="hint small">часть {b.part} · {b.source}</span>
        </button>
      ))}
    </>
  );
}

function MapView({
  map,
  onBlock,
  onReview,
  onDiagnostic,
  onTest,
  onCheatSheet,
  onClose,
}: {
  map: UkMap;
  onBlock: (id: string) => void;
  onReview: () => void;
  onDiagnostic: () => void;
  onTest: (part: number) => void;
  onCheatSheet: () => void;
  onClose: () => void;
}) {
  const blocks = map.parts.flatMap((p) => p.blocks);
  const done = blocks.filter((b) => b.status === "mastered" || b.status === "known").length;
  return (
    <main className="screen">
      <h1>🇺🇦 Украинский: грамматика</h1>
      <section className="tiles">
        <div className="tile">
          <span className="num">{blocks.length}</span>
          <span className="hint small">блоков</span>
        </div>
        <div className="tile">
          <span className="num">{done}</span>
          <span className="hint small">освоено / знаю</span>
        </div>
        <div className="tile">
          <span className="num">{map.due}</span>
          <span className="hint small">ошибок к повторению</span>
        </div>
      </section>
      {map.due > 0 && (
        <button className="button big" onClick={onReview}>
          Повторить ошибки ({map.due})
        </button>
      )}
      {map.refresh > 0 && <p className="hint small center-text">в том числе {map.refresh} из освоенных блоков, давно не повторявшихся</p>}
      {map.diagnostic.tested < map.diagnostic.total && (
        <button className="secondary" onClick={onDiagnostic}>
          🧭 Пройти диагностику
          <span className="hint small">проверено блоков: {map.diagnostic.tested} из {map.diagnostic.total} — покажет, что можно пропустить</span>
        </button>
      )}
      <button className="secondary" onClick={onCheatSheet}>
        📋 Шпаргалка
        <span className="hint small">15 правил, которые дают больше всего</span>
      </button>
      <Search onBlock={onBlock} />
      {map.parts.map((p) => (
        <section key={p.part} className="settings-block">
          <h2>{p.part}. {p.title}{p.test?.passed ? " ✓" : ""}</h2>
          {p.blocks.length === 0 ? (
            <p className="hint small">Блоки этой части ещё готовятся.</p>
          ) : (
            p.blocks.map((b) => (
              <button key={b.id} className="secondary" onClick={() => { haptic("tap"); onBlock(b.id); }}>
                {b.title}
                <span className="hint small">
                  {STATUS[b.status]} · {b.answered} / {b.exercises}
                  {b.diag !== null && b.status !== "known" && b.diag < 2 ? " · 🧭 рекомендован" : ""}
                </span>
              </button>
            ))
          )}
          {p.blocks.length > 0 && (
            <button className="secondary center-text" onClick={() => { haptic("tap"); onTest(p.part); }}>
              📝 Контрольная части
              <span className="hint small">
                {PART_TEST_SIZE} заданий из всех блоков
                {p.test ? ` · лучший результат ${p.test.best} %${p.test.passed ? " ✓" : ""}` : ` · нужно ${Math.round(PART_TEST_PASS * 100)} %`}
              </span>
            </button>
          )}
        </section>
      ))}
      {map.diagnostic.tested === map.diagnostic.total && (
        <button className="secondary center-text" onClick={onDiagnostic}>🧭 Диагностика ещё раз</button>
      )}
      <button className="secondary center-text" onClick={onClose}>На главную</button>
    </main>
  );
}

type View =
  | { kind: "map" }
  | { kind: "block"; id: string }
  | { kind: "run"; items: UkItem[]; mode: UkMode; title: string; back: View }
  | { kind: "done"; correct: number; total: number; back: View }
  | { kind: "diag-pick" }
  | { kind: "diag"; part: number }
  | { kind: "test"; part: number }
  | { kind: "cheatsheet" };

function Screen({ close }: { close: () => void }) {
  const [map, setMap] = useState<UkMap | null>(null);
  const [view, setView] = useState<View>({ kind: "map" });
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    void flushUkAnswers().then(() => getUkMap()).then((m) => (m ? setMap(m) : close()), (e) => setError(String(e)));
  }, [close]);
  useEffect(() => reload(), [reload]);
  const go = (v: View) => {
    setView(v);
    window.scrollTo(0, 0);
    if (v.kind === "map") reload();
  };

  if (error) return <Failure error={error} onBack={close} />;
  if (!map) return <main className="screen center hint">Загрузка…</main>;
  switch (view.kind) {
    case "block":
      return (
        <BlockScreen
          key={view.id}
          id={view.id}
          onBack={() => go({ kind: "map" })}
          onRun={(items, title) => go({ kind: "run", items, mode: "learn", title, back: view })}
        />
      );
    case "run":
      return (
        <Run
          items={view.items}
          mode={view.mode}
          title={view.title}
          retry={view.mode === "learn"}
          onFinish={(r) => go({ kind: "done", correct: r.filter((x) => x.correct).length, total: r.length, back: view.back })}
        />
      );
    case "done":
      return (
        <main className="screen center">
          <h1>{view.correct} из {view.total}</h1>
          <p className="hint">{view.correct === view.total ? "Всё верно 🎉" : "Упражнения с ошибками вернутся в «Повторить ошибки»."}</p>
          <button className="button big" onClick={() => go(view.back)}>{view.back.kind === "block" ? "К блоку" : "К карте курса"}</button>
        </main>
      );
    case "diag-pick":
      return <DiagnosticPicker map={map} onPick={(part) => go({ kind: "diag", part })} onBack={() => go({ kind: "map" })} />;
    case "diag":
      return <DiagnosticRun key={view.part} part={view.part} onDone={() => go({ kind: "map" })} />;
    case "test":
      return <PartTest key={view.part} part={view.part} onDone={() => go({ kind: "map" })} />;
    case "cheatsheet":
      return <CheatSheet onBlock={(id) => go({ kind: "block", id })} onBack={() => go({ kind: "map" })} />;
    case "map":
      return (
        <MapView
          map={map}
          onBlock={(id) => go({ kind: "block", id })}
          onTest={(part) => go({ kind: "test", part })}
          onCheatSheet={() => go({ kind: "cheatsheet" })}
          onDiagnostic={() => go({ kind: "diag-pick" })}
          onClose={close}
          onReview={() => {
            getUkReview().then(
              (items) => (items.length ? go({ kind: "run", items, mode: "review", title: "Повторение ошибок", back: { kind: "map" } }) : reload()),
              (e) => setError(String(e)),
            );
          }}
        />
      );
  }
}

// --- home entry ---

function HomeEntry({ open }: { open: () => void }) {
  const [map, setMap] = useState<UkMap | null>(null);
  useEffect(() => {
    getUkMap().then(setMap, () => setMap(null));
  }, []);
  if (!map) return null; // a personal copy, or not reachable
  const blocks = map.parts.flatMap((p) => p.blocks);
  if (!blocks.length) return null;
  const done = blocks.filter((b) => b.status === "mastered" || b.status === "known").length;
  return (
    <button className="secondary" onClick={open}>
      🇺🇦 Украинский: грамматика
      <span className="hint small">
        {done} из {blocks.length} блоков{map.due ? ` · ошибок к повторению: ${map.due}` : ""}
      </span>
    </button>
  );
}

export const ukrainianFeature: MiniFeature = { id: "ukrainian", HomeEntry, Screen };
