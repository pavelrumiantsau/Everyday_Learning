// «Пробный экзамен» of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.1, §6.5), opened from an exam unit of
// «Курс». Part 1 (reading and writing) and part 2 (listening) are answered here, part 3 (speaking) in the bot chat by
// voice. Answers are shown only after a part is handed in; the result follows the NŠA rules (computed by the Worker).
import { useEffect, useState } from "react";
import { getExam, startExam, startExamSpeaking, submitExamListening, submitExamRw, type ExamLevel, type ExamQuestion, type ExamState } from "../api";
import { haptic, tg } from "../telegram";

const MAX_PLAYS = 2; // each recording, as on the exam
const LEVEL = (l: ExamLevel | null) => (l ? `сдано на ${l}` : "не сдано");
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// Unsent answers survive closing the Mini App (per viewer, best effort).
const draftKey = (id: string, attempt: number, part: string) => `exam:${id}:${attempt}:${part}`;
function loadDraft<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: answers live only in memory */
  }
}

export function ExamScreen({ id, back }: { id: string; back: () => void }) {
  const [state, setState] = useState<ExamState | null>(null);
  const [part, setPart] = useState<"overview" | "rw" | "listening">("overview");
  const [error, setError] = useState<string | null>(null);
  const reload = () => getExam(id).then(setState, (e) => setError(String(e)));
  useEffect(() => void reload(), [id]);

  if (error) return <main className="screen center hint">{error}</main>;
  if (!state) return <main className="screen center hint">Загрузка…</main>;
  if (part === "rw") return <RwPart state={state} done={(s) => { if (s) setState(s); setPart("overview"); }} />;
  if (part === "listening") return <ListeningPart state={state} done={(s) => { if (s) setState(s); setPart("overview"); }} />;

  const { exam, attempt } = state;
  const open = attempt && !attempt.finishedAt;
  const begin = async () => {
    if (attempt && !(await confirmed(open ? "Начать заново? Ответы этой попытки останутся в истории, но не будут продолжены." : "Начать новую попытку?"))) return;
    haptic("tap");
    setState(await startExam(id));
  };
  const speaking = async () => {
    haptic("tap");
    await startExamSpeaking(id);
    tg?.close?.(); // the situations are waiting in the chat with the bot
  };
  const r = attempt?.result;
  return (
    <main className="screen">
      <div className="top-line">
        <button className="link" onClick={back}>‹ К юниту</button>
        {r?.complete && <span className="hint small">итог: {r.overall ?? "не сдан"}</span>}
      </div>
      <h1>🎓 {exam.title}</h1>
      <p className="hint small">
        Формат экзамена NŠA. В каждой части нужно 60%: чтение и письмо — {exam.pass.rw.A1} из {exam.points.rw.A1}
        {exam.level === "A2" ? ` (A1) и ${exam.pass.rw.A2} из ${exam.points.rw.A2} (A2)` : ""}, аудирование — {exam.pass.listening.A1} из 10
        {exam.level === "A2" ? " для каждого уровня" : ""}, говорение — от 5 баллов из 10 (A1){exam.level === "A2" ? ", от 6 и две ситуации вместе на 5 (A2)" : ""}.
      </p>
      {r?.complete && (
        <section className="settings-block">
          <h2>{r.overall ? `Экзамен сдан на ${r.overall} 🎉` : "Экзамен пока не сдан"}</h2>
          <p className="hint small">Итог — самый низкий уровень из трёх частей. Попробуйте ещё раз через несколько дней — задания те же, но цель — уверенность.</p>
        </section>
      )}
      <section className="settings-block">
        <h2>1. Чтение и письмо</h2>
        {attempt?.rw ? (
          <p>
            {attempt.rw.points.A1}/{exam.points.rw.A1}
            {exam.level === "A2" ? ` + ${attempt.rw.points.A2}/${exam.points.rw.A2}` : ""} — {LEVEL(r!.rw)}
          </p>
        ) : (
          <p className="hint small">{exam.rw.length} заданий: тексты, пропуски и {exam.rw.filter((t) => t.kind === "writing").length} письменных (оценивает ИИ, 0–3 × 2).</p>
        )}
        {open && <button className="secondary" onClick={() => { haptic("tap"); setPart("rw"); }}>{attempt.rw ? "Посмотреть ответы ›" : "Начать часть 1 ›"}</button>}
        {!open && attempt?.rw && <button className="secondary" onClick={() => setPart("rw")}>Посмотреть ответы ›</button>}
      </section>
      <section className="settings-block">
        <h2>2. Аудирование</h2>
        {attempt?.listening ? (
          <p>
            {attempt.listening.points.A1}/10{exam.level === "A2" ? ` + ${attempt.listening.points.A2}/10` : ""} — {LEVEL(r!.listening)}
          </p>
        ) : (
          <p className="hint small">{exam.listening.length} записи, каждую можно прослушать два раза.</p>
        )}
        {(open || attempt?.listening) && <button className="secondary" onClick={() => { haptic("tap"); setPart("listening"); }}>{attempt?.listening ? "Посмотреть ответы ›" : "Начать часть 2 ›"}</button>}
      </section>
      <section className="settings-block">
        <h2>3. Говорение</h2>
        {attempt?.speaking ? (
          <p>{attempt.speaking.scores.join(" + ")} — {LEVEL(r!.speaking)}</p>
        ) : (
          <>
            <ul className="summary-list">{exam.speaking.map((s) => <li key={s.id}>{s.title}</li>)}</ul>
            <p className="hint small">Ситуации придут в чат с ботом по одной, отвечайте голосовыми (1–2 минуты). Каждую ИИ оценит на 0–3.</p>
          </>
        )}
        {open && !attempt.speaking && <button className="secondary" onClick={() => void speaking()}>Начать говорение в чате ›</button>}
      </section>
      <div className="spacer" />
      <button className={open ? "secondary center-text" : "button big"} onClick={() => void begin()}>
        {!attempt ? "Начать экзамен" : open ? "Начать заново" : "Новая попытка"}
      </button>
    </main>
  );
}

const confirmed = (text: string) =>
  new Promise<boolean>((resolve) => {
    const c = (tg as unknown as { showConfirm?: (t: string, cb: (ok: boolean) => void) => void } | undefined)?.showConfirm;
    if (c) c(text, resolve);
    else resolve(window.confirm(text));
  });

/** Options of one question: before handing in — the choice; after — right and wrong. */
function Options({ q, picked, correct, pick }: { q: ExamQuestion; picked: number | null; correct?: number; pick?: (j: number) => void }) {
  return (
    <div className="answer">
      {q.options.map((o, j) => {
        const review = correct !== undefined;
        const cls = review ? (j === correct ? "right" : picked === j ? "wrong-pick" : "") : picked === j ? "active" : "";
        return (
          <button key={j} className={`secondary center-text ${cls}`} disabled={review} onClick={() => { haptic("tap"); pick?.(j); }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function RwPart({ state, done }: { state: ExamState; done: (s?: ExamState) => void }) {
  const { exam, attempt } = state;
  const review = attempt?.rw ?? null;
  const choice = exam.rw.flatMap((t) => (t.kind === "writing" ? [] : [t]));
  const writingTasks = exam.rw.flatMap((t) => (t.kind === "writing" ? [t] : []));
  const key = draftKey(exam.id, attempt?.id ?? 0, "rw");
  const [answers, setAnswers] = useState<(number | null)[][]>(() => review?.answers ?? loadDraft(key, { answers: choice.map((t) => t.questions.map(() => null)) }).answers);
  const [texts, setTexts] = useState<string[]>(() => review?.writing.map((w) => w.text) ?? loadDraft(key, { texts: writingTasks.map(() => "") as string[] }).texts ?? writingTasks.map(() => ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!review) saveDraft(key, { answers, texts }); }, [answers, texts]);

  const submit = async () => {
    const empty = answers.flat().filter((a) => a === null).length + texts.filter((t) => !t.trim()).length;
    if (empty && !(await confirmed(`Без ответа: ${empty}. Сдать часть 1?`))) return;
    setBusy(true);
    setError(null);
    try {
      const s = await submitExamRw(exam.id, answers, texts);
      haptic("done");
      done(s);
    } catch (e) {
      setError(String(e).includes("503") ? "ИИ сейчас не отвечает — ответы сохранены, попробуйте сдать через минуту." : String(e));
    } finally {
      setBusy(false);
    }
  };

  let c = -1;
  let w = -1;
  return (
    <main className="screen">
      <div className="top-line">
        <button className="link" onClick={() => done()}>‹ Экзамен</button>
        <span className="hint small">Часть 1 · чтение и письмо</span>
      </div>
      {exam.rw.map((t, i) => {
        if (t.kind === "writing") {
          const k = ++w;
          const fb = review?.writing[k];
          return (
            <section key={i} className="settings-block">
              <h2>Задание {i + 1} · {t.cefr} · письмо</h2>
              <p>{t.situation}</p>
              <p><i>{t.prompt}</i>{t.words ? ` (${t.words[0]}–${t.words[1]} слов)` : ""}</p>
              <ul className="summary-list">{t.checklist.map((x, j) => <li key={j}>{fb ? (fb.feedback.checklist[j] ? "✅ " : "❌ ") : ""}{x}</li>)}</ul>
              <textarea className="own-text" value={texts[k]} readOnly={!!review} placeholder="Rašykite čia…" onChange={(e) => setTexts(texts.map((x, j) => (j === k ? e.target.value : x)))} />
              <p className="hint small">слов: {words(texts[k] ?? "")}</p>
              {fb && (
                <div className="lesson-text">
                  <p><b>Оценка: {fb.feedback.score}/3</b> → {fb.feedback.score * 2} балла</p>
                  {fb.feedback.mistakes.map((m, j) => <p key={j}><s>{m.original}</s> → <b>{m.corrected}</b> — {m.explanation}</p>)}
                  {fb.feedback.comment && <p>{fb.feedback.comment}</p>}
                  <p>💡 <i>{fb.example}</i></p>
                </div>
              )}
            </section>
          );
        }
        const k = ++c;
        return (
          <section key={i} className="settings-block">
            <h2>Задание {i + 1} · {t.cefr}</h2>
            <p className="hint small">{t.instruction}</p>
            <div className="lesson-text">{t.text.split("\n").map((line, j) => <p key={j}>{line}</p>)}</div>
            {t.questions.map((q, n) => (
              <div key={n}>
                <p><b>{t.kind === "gaps" ? `(${n + 1})` : `${n + 1}.`}</b> {q.q}</p>
                <Options q={q} picked={answers[k]?.[n] ?? null} correct={review?.correct[k]?.[n]} pick={(j) => setAnswers(answers.map((a, x) => (x === k ? a.map((v, y) => (y === n ? j : v)) : a)))} />
              </div>
            ))}
          </section>
        );
      })}
      {!review && (
        <>
          {error && <p className="hint">{error}</p>}
          <button className="button big" disabled={busy} onClick={() => void submit()}>{busy ? "ИИ проверяет письмо…" : "Сдать часть 1"}</button>
        </>
      )}
    </main>
  );
}

function ListeningPart({ state, done }: { state: ExamState; done: (s?: ExamState) => void }) {
  const { exam, attempt } = state;
  const review = attempt?.listening ?? null;
  const key = draftKey(exam.id, attempt?.id ?? 0, "listening");
  const [answers, setAnswers] = useState<(number | null)[][]>(() => review?.answers ?? loadDraft(key, exam.listening.map((t) => t.questions.map(() => null))));
  const [plays, setPlays] = useState<number[]>(() => loadDraft(`${key}:plays`, exam.listening.map(() => 0)));
  const [playing, setPlaying] = useState<HTMLAudioElement | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => playing?.pause(), [playing]);
  useEffect(() => { if (!review) { saveDraft(key, answers); saveDraft(`${key}:plays`, plays); } }, [answers, plays]);

  const play = (i: number) => {
    if (!review && (plays[i] ?? 0) >= MAX_PLAYS) return;
    haptic("tap");
    playing?.pause();
    const a = new Audio(`/audio/lt/${exam.listening[i]!.audio}.mp3`);
    a.play().catch(() => undefined);
    setPlaying(a);
    if (!review) setPlays(plays.map((p, k) => (k === i ? p + 1 : p)));
  };
  const submit = async () => {
    const empty = answers.flat().filter((a) => a === null).length;
    if (empty && !(await confirmed(`Без ответа: ${empty}. Сдать часть 2?`))) return;
    setBusy(true);
    try {
      const s = await submitExamListening(exam.id, answers);
      haptic("done");
      done(s);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="screen">
      <div className="top-line">
        <button className="link" onClick={() => done()}>‹ Экзамен</button>
        <span className="hint small">Часть 2 · аудирование</span>
      </div>
      {exam.listening.map((t, i) => (
        <section key={i} className="settings-block">
          <h2>Задание {i + 1} · {t.cefr}</h2>
          <p className="hint small">{t.instruction}</p>
          <button className="secondary center-text" disabled={!review && (plays[i] ?? 0) >= MAX_PLAYS} onClick={() => play(i)}>
            {review ? "▶ Послушать" : (plays[i] ?? 0) === 0 ? "▶ Слушать" : (plays[i] ?? 0) < MAX_PLAYS ? "▶ Ещё раз (последний)" : "Прослушано 2 раза"}
          </button>
          {t.questions.map((q, n) => (
            <div key={n}>
              <p><b>{n + 1}.</b> {q.q}</p>
              <Options q={q} picked={answers[i]?.[n] ?? null} correct={review?.correct[i]?.[n]} pick={(j) => setAnswers(answers.map((a, x) => (x === i ? a.map((v, y) => (y === n ? j : v)) : a)))} />
            </div>
          ))}
          {review && (
            <div className="lesson-text">{review.transcripts[i]?.map((l, j) => <p key={j}><b>{l.speaker}:</b> {l.text}</p>)}</div>
          )}
        </section>
      ))}
      {!review && <button className="button big" disabled={busy} onClick={() => void submit()}>{busy ? "Сохраняю…" : "Сдать часть 2"}</button>}
    </main>
  );
}
