// Reading mode: graded texts and the learner's own pasted texts; tap a word → meaning (glossary or AI) → add to cards;
// 3 comprehension questions and a difficulty rating at the end (the rating sets the level of the next "Текст дня").
import { grammarLabel } from "@el/core/labels";
import { paragraphs, sentenceAt, tokenize } from "@el/core/reading";
import { useEffect, useMemo, useState } from "react";
import {
  activeLangs,
  addOwnText,
  addWordToCards,
  deleteOwnText,
  getReading,
  getText,
  lookupWord,
  markTextRead,
  type Lang,
  type ReadingList,
  type ReadingRating,
  type ReadingTextFull,
  type TextSummary,
  type WordInfo,
} from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

function HomeEntry({ open }: { open: () => void }) {
  const [list, setList] = useState<ReadingList | null>(null);
  useEffect(() => {
    getReading().then(setList, () => setList(null));
  }, []);
  if (!list) return null;
  const next = list.texts.find((t) => t.id === list.nextId) ?? list.texts.find((t) => !t.read);
  const unread = list.texts.filter((t) => !t.read).length;
  return (
    <button className="secondary" onClick={open}>
      📖 Чтение
      <span className="hint small">
        {next ? `${FLAG[next.lang]} «${next.title}» · ${next.cefr} · непрочитанных: ${unread}` : "все тексты прочитаны ✓ · можно вставить свой"}
      </span>
    </button>
  );
}

function TextButton({ t, onOpen }: { t: TextSummary; onOpen: () => void }) {
  return (
    <button className="secondary" onClick={onOpen}>
      <span>
        {FLAG[t.lang]} {t.title} {t.read && "✓"}
      </span>
      <span className="hint small">
        {t.cefr ? `${t.cefr} · ` : ""}
        {t.topic} · {t.words} слов
      </span>
    </button>
  );
}

function Screen({ close }: { close: () => void }) {
  const [list, setList] = useState<ReadingList | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const reload = () => getReading().then(setList, () => setList({ texts: [], own: [], level: "B1", nextId: null }));
  useEffect(() => void reload(), []);

  if (adding) {
    return (
      <AddOwn
        onCancel={() => setAdding(false)}
        onSaved={(id) => {
          setAdding(false);
          setOpenId(id);
        }}
      />
    );
  }
  if (openId) {
    const own = list?.own.find((t) => t.id === openId);
    return (
      <Reader
        id={openId}
        lang={own?.lang ?? (openId.slice(0, 2) as Lang)}
        onDone={() => {
          setOpenId(null);
          void reload();
        }}
      />
    );
  }
  const next = list?.texts.find((t) => t.id === list.nextId);
  const rest = list?.texts.filter((t) => t.id !== list.nextId) ?? [];
  return (
    <main className="screen">
      <h1>Чтение</h1>
      <p className="hint small">Нажимай на незнакомые слова: покажу значение и формы, можно добавить в карточки.</p>
      {!list ? (
        <p className="hint">Загрузка…</p>
      ) : (
        <>
          {next && (
            <>
              <h2>Следующий текст · уровень {list.level}</h2>
              <p className="hint small">Уровень подбирается по твоим оценкам «легко / сложно» после чтения.</p>
              <TextButton t={next} onOpen={() => setOpenId(next.id)} />
            </>
          )}
          <h2>Свои тексты</h2>
          <p className="hint small">Вставь статью с lrt.lt или любой другой текст — он сохранится только у тебя.</p>
          <button className="secondary center-text" onClick={() => setAdding(true)}>＋ Вставить свой текст</button>
          {list.own.map((t) => (
            <TextButton key={t.id} t={t} onOpen={() => setOpenId(t.id)} />
          ))}
          <h2>Все тексты курса</h2>
          {rest.map((t) => (
            <TextButton key={t.id} t={t} onOpen={() => setOpenId(t.id)} />
          ))}
        </>
      )}
      <div className="spacer" />
      <button className="secondary center-text" onClick={close}>На главную</button>
    </main>
  );
}

const LANGS: Lang[] = ["lt", "es", "fr"];

function AddOwn({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [lang, setLang] = useState<Lang>("lt");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const save = async () => {
    haptic("tap");
    setSaving(true);
    setError(null);
    try {
      const r = await addOwnText({ lang, title: title.trim() || undefined, url: url.trim() || undefined, text });
      haptic("done");
      onSaved(r.id);
    } catch (e) {
      const m = /\{"error":"([^"]+)"/.exec(String(e));
      setError(m ? m[1]! : String(e));
      setSaving(false);
    }
  };

  return (
    <main className="screen">
      <h1>Свой текст</h1>
      <p className="hint small">Скопируй текст статьи (например, с lrt.lt) и вставь сюда. Незнакомые слова объяснит ИИ, вопросы на понимание он тоже составит.</p>
      <div className="chips">
        {activeLangs().map((l) => (
          <button key={l} className={`chip ${lang === l ? "on" : ""}`} onClick={() => setLang(l)}>{FLAG[l]}</button>
        ))}
      </div>
      <input className="text-input" placeholder="Заголовок (необязательно)" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <input className="text-input" placeholder="Ссылка (необязательно)" value={url} inputMode="url" onChange={(e) => setUrl(e.target.value)} />
      <textarea className="text-input own-text" placeholder="Текст…" value={text} onChange={(e) => setText(e.target.value)} />
      <p className="hint small">{words} слов (нужно от 30)</p>
      {error && <p className="hint">{error}</p>}
      <div className="spacer" />
      <button className="button big" disabled={saving || words < 30} onClick={() => void save()}>
        {saving ? "Сохраняю…" : "Читать"}
      </button>
      <button className="secondary center-text" onClick={onCancel}>Отмена</button>
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
        {FLAG[lang]} {text.cefr ? `${text.cefr} · ` : ""}
        {text.topic}
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
      <button className="button big" onClick={() => setQuiz(true)}>
        {text.questions.length ? "Проверить понимание" : "Дочитал(а)"}
      </button>
      {text.own && (
        <button
          className="secondary center-text"
          onClick={() => {
            if (window.confirm("Удалить этот текст?")) void deleteOwnText(text.id).then(onDone, onDone);
          }}
        >
          🗑 Удалить текст
        </button>
      )}
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

const RATINGS: { id: ReadingRating; label: string }[] = [
  { id: "easy", label: "😌 Легко" },
  { id: "ok", label: "🙂 Нормально" },
  { id: "hard", label: "😵 Сложно" },
];

function Quiz({ text, onDone }: { text: ReadingTextFull; onDone: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => text.questions.map(() => null));
  const [rating, setRating] = useState<ReadingRating | null>(null);
  const all = answers.every((a) => a !== null);
  const correct = answers.filter((a, i) => a === text.questions[i]!.answer).length;

  const finish = async () => {
    haptic("done");
    await markTextRead(text.id, correct, text.questions.length, rating ?? undefined).catch(() => undefined);
    onDone();
  };

  return (
    <main className="screen">
      <h1>{text.questions.length ? "Понимание текста" : "Как текст?"}</h1>
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
      {all && text.questions.length > 0 && <p className="done-note">Верно {correct} из {text.questions.length}</p>}
      {all && (
        <section className="question">
          <p>Как тебе этот текст?</p>
          <div className="chips">
            {RATINGS.map((r) => (
              <button key={r.id} className={`chip ${rating === r.id ? "on" : ""}`} onClick={() => (haptic("tap"), setRating(r.id))}>
                {r.label}
              </button>
            ))}
          </div>
          {!text.own && <p className="hint small">По оценке подберу уровень следующего текста.</p>}
        </section>
      )}
      <div className="spacer" />
      <button className="button big" disabled={!all} onClick={() => void finish()}>Прочитано ✓</button>
    </main>
  );
}

export const readingFeature: MiniFeature = { id: "reading", HomeEntry, Screen };
