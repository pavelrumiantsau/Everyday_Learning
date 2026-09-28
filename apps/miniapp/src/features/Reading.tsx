// Reading mode: graded texts; tap a word → meaning (glossary or AI) → add to cards; 3 comprehension questions at the end.
import { grammarLabel } from "@el/core/labels";
import { paragraphs, sentenceAt, tokenize } from "@el/core/reading";
import { useEffect, useMemo, useState } from "react";
import {
  addWordToCards,
  getText,
  getTexts,
  lookupWord,
  markTextRead,
  type Lang,
  type ReadingTextFull,
  type TextSummary,
  type WordInfo,
} from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

function HomeEntry({ open }: { open: () => void }) {
  const [texts, setTexts] = useState<TextSummary[] | null>(null);
  useEffect(() => {
    getTexts().then(setTexts, () => setTexts(null));
  }, []);
  if (!texts?.length) return null;
  const unread = texts.filter((t) => !t.read);
  const next = unread[0];
  return (
    <button className="secondary" onClick={open}>
      📖 Чтение
      <span className="hint small">
        {next ? `${FLAG[next.lang]} «${next.title}» · непрочитанных: ${unread.length}` : "все тексты прочитаны ✓"}
      </span>
    </button>
  );
}

function Screen({ close }: { close: () => void }) {
  const [texts, setTexts] = useState<TextSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const reload = () => getTexts().then(setTexts, () => setTexts([]));
  useEffect(() => void reload(), []);

  if (openId) {
    const lang = openId.slice(0, 2) as Lang;
    return (
      <Reader
        id={openId}
        lang={lang}
        onDone={() => {
          setOpenId(null);
          void reload();
        }}
      />
    );
  }
  return (
    <main className="screen">
      <h1>Чтение</h1>
      <p className="hint small">Нажимай на незнакомые слова: покажу значение и формы, можно добавить в карточки.</p>
      {!texts ? (
        <p className="hint">Загрузка…</p>
      ) : (
        texts.map((t) => (
          <button key={t.id} className="secondary" onClick={() => setOpenId(t.id)}>
            <span>
              {FLAG[t.lang]} {t.title} {t.read && "✓"}
            </span>
            <span className="hint small">
              {t.cefr} · {t.topic} · {t.words} слов
            </span>
          </button>
        ))
      )}
      <div className="spacer" />
      <button className="secondary center-text" onClick={close}>На главную</button>
    </main>
  );
}

interface Selected { word: string; sentence: string; key: string }

function Reader({ id, lang, onDone }: { id: string; lang: Lang; onDone: () => void }) {
  const [text, setText] = useState<ReadingTextFull | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [quiz, setQuiz] = useState(false);
  useEffect(() => {
    getText(id).then((r) => setText(r.text), () => undefined);
  }, [id]);
  const paras = useMemo(() => (text ? paragraphs(text.text) : []), [text]);

  if (!text) return <main className="screen center hint">Загрузка…</main>;
  if (quiz) return <Quiz text={text} onDone={onDone} />;

  return (
    <main className="screen">
      <h1>{text.title}</h1>
      <p className="hint small">
        {FLAG[lang]} {text.cefr} · {text.topic}
      </p>
      <article className="reader">
        {paras.map((p, pi) => (
          <p key={pi}>
            {tokenize(p).map((t, ti) =>
              t.word ? (
                <span
                  key={ti}
                  className={`w ${selected?.key === `${pi}:${ti}` ? "sel" : ""}`}
                  onClick={() => {
                    haptic("tap");
                    setSelected({ word: t.text, sentence: sentenceAt(p, t.start), key: `${pi}:${ti}` });
                  }}
                >
                  {t.text}
                </span>
              ) : (
                <span key={ti}>{t.text}</span>
              ),
            )}
          </p>
        ))}
      </article>
      <div className="spacer" />
      <button className="button big" onClick={() => setQuiz(true)}>Проверить понимание</button>
      {selected && <WordSheet lang={lang} textId={text.id} sel={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function WordSheet({ lang, textId, sel, onClose }: { lang: Lang; textId: string; sel: Selected; onClose: () => void }) {
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setInfo(null);
    setError(null);
    lookupWord({ lang, word: sel.word, sentence: sel.sentence, textId }).then(setInfo, (e) => setError(String(e).includes("502") ? "Не получилось найти слово — попробуй позже." : String(e)));
  }, [lang, sel.word, sel.sentence, textId]);

  const add = async () => {
    if (!info) return;
    haptic("tap");
    setAdding(true);
    try {
      const { source: _s, added: _a, ...word } = info;
      await addWordToCards({ ...word, lang, example: sel.sentence });
      haptic("done");
      setInfo({ ...info, added: true });
    } catch (e) {
      setError(String(e));
    }
    setAdding(false);
  };

  const dictForm = info ? [info.lemma, info.forms && `${info.forms.pres}, ${info.forms.past}`, info.gen].filter(Boolean).join(", ") : "";
  const label = info ? grammarLabel({ id: `${lang}-w-0000`, pos: info.pos, gender: info.gender }) : "";
  return (
    <div className="sheet" role="dialog" aria-label={sel.word}>
      <div className="sheet-head">
        <b>{sel.word}</b>
        <button className="link" onClick={onClose} aria-label="Закрыть">✕</button>
      </div>
      {error ? (
        <p className="hint">{error}</p>
      ) : !info ? (
        <p className="hint">Ищу…</p>
      ) : (
        <>
          <p className="sheet-dict">{dictForm}</p>
          {label && <p className="hint small">{label}</p>}
          <p className="meaning">{info.meaning}</p>
          {info.note && <p className="note">💡 {info.note}</p>}
          <button className="button" disabled={info.added || adding} onClick={() => void add()}>
            {info.added ? "В карточках ✓" : adding ? "Добавляю…" : "+ В карточки"}
          </button>
        </>
      )}
    </div>
  );
}

function Quiz({ text, onDone }: { text: ReadingTextFull; onDone: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => text.questions.map(() => null));
  const all = answers.every((a) => a !== null);
  const correct = answers.filter((a, i) => a === text.questions[i]!.answer).length;

  const finish = async () => {
    haptic("done");
    await markTextRead(text.id, correct, text.questions.length).catch(() => undefined);
    onDone();
  };

  return (
    <main className="screen">
      <h1>Понимание текста</h1>
      {text.questions.map((q, qi) => (
        <section key={qi} className="question">
          <p>
            <b>{qi + 1}.</b> {q.q}
          </p>
          <div className="chips">
            {q.options.map((o, oi) => {
              const picked = answers[qi] === oi;
              const state = answers[qi] === null ? "" : oi === q.answer ? "right" : picked ? "wrong" : "";
              return (
                <button
                  key={oi}
                  className={`chip ${state}`}
                  disabled={answers[qi] !== null}
                  onClick={() => {
                    haptic("tap");
                    setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)));
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {all && <p className="done-note">Верно {correct} из {text.questions.length}</p>}
      <div className="spacer" />
      <button className="button big" disabled={!all} onClick={() => void finish()}>Прочитано ✓</button>
    </main>
  );
}

export const readingFeature: MiniFeature = { id: "reading", HomeEntry, Screen };
