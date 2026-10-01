// «Учить новые слова»: new words in groups of 5. First each word is shown in full («знакомство»), then a drill repeats
// them until each is recalled twice in a row — word → meaning, then meaning → word; a miss brings the word back after
// two other cards. Every answer goes to FSRS on the meaning card ("Помню" = Good, "Не помню" = Again): two Goods in a
// row are exactly what moves a new card into review, so a finished word comes back in «Повторить» in a day or two.
import { grammarLabel } from "@el/core/labels";
import { useEffect, useState } from "react";
import { flushReviews, getLearn, recordReview, type WordCard } from "../api";
import { Play } from "../Audio";
import { FLAG } from "../flags";
import { ReportButton } from "../ReportButton";
import { haptic } from "../telegram";

const GROUP = 5;
const NEEDED = 2; // correct answers in a row
const MISS_GAP = 2; // a missed word comes back after this many other cards

interface Step { card: WordCard; streak: number }
type Phase = { kind: "loading" } | { kind: "intro"; index: number } | { kind: "drill" } | { kind: "done" };

export function LearnNew({ onDone }: { onDone: () => void }) {
  const [group, setGroup] = useState<WordCard[]>([]);
  const [left, setLeft] = useState(0); // words still waiting after this group
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [queue, setQueue] = useState<Step[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [learned, setLearned] = useState(0);
  const [error, setError] = useState(false);

  const load = async () => {
    setPhase({ kind: "loading" });
    try {
      await flushReviews(); // answers of the previous group first, so its words aren't offered again
      const { cards, total } = await getLearn(GROUP);
      setGroup(cards);
      setLeft(Math.max(0, total - cards.length));
      setQueue(cards.map((card) => ({ card, streak: 0 })));
      setPhase(cards.length ? { kind: "intro", index: 0 } : { kind: "done" });
    } catch {
      setError(true);
    }
  };
  useEffect(() => void load(), []);

  const finish = () => {
    void flushReviews();
    haptic("done");
    setPhase({ kind: "done" });
  };

  if (error) {
    return (
      <main className="screen center">
        <p>Не получилось загрузить слова.</p>
        <button className="button" onClick={() => { setError(false); void load(); }}>Повторить</button>
      </main>
    );
  }
  if (phase.kind === "loading") return <main className="screen center hint">Загрузка…</main>;

  if (phase.kind === "done") {
    return (
      <main className="screen center">
        {group.length || learned ? (
          <>
            <h1>Готово! 🎉</h1>
            <p className="hint">Выучено слов: {learned}. Дальше они будут в «Повторить» — первый раз через день-два.</p>
          </>
        ) : (
          <>
            <h1>Новых слов нет</h1>
            <p className="hint">Все слова выучены. Новые придут утром — или возьми их на главной: «➕ Ещё новые слова сейчас».</p>
          </>
        )}
        {left > 0 && (
          <button className="button" onClick={() => { haptic("tap"); void load(); }}>
            Следующие {Math.min(GROUP, left)} (ещё {left})
          </button>
        )}
        <button className="secondary center-text" onClick={onDone}>На главную</button>
      </main>
    );
  }

  if (phase.kind === "intro") {
    const card = group[phase.index]!;
    const next = (known: boolean) => {
      haptic("tap");
      const rest = known ? queue.filter((s) => s.card.cardId !== card.cardId) : queue;
      if (known) {
        recordReview(card.cardId, 4); // «Уже знаю» = Easy: straight into review, no drill
        setLearned((n) => n + 1);
        setQueue(rest);
      }
      if (phase.index + 1 < group.length) setPhase({ kind: "intro", index: phase.index + 1 });
      else if (rest.length) setPhase({ kind: "drill" });
      else finish();
    };
    return (
      <main className="screen">
        <Progress value={phase.index / group.length} label={`Знакомство · ${phase.index + 1} / ${group.length}`} card={card} />
        <div className="card">
          <WordHead card={card} />
          <WordDetails card={card} />
        </div>
        <div className="spacer" />
        <div className="ratings two">
          <button className="rate easy" onClick={() => next(true)}>Уже знаю</button>
          <button className="rate good" onClick={() => next(false)}>Запомнил →</button>
        </div>
      </main>
    );
  }

  // Drill
  const step = queue[0];
  if (!step) return null; // finish() already switched to "done"
  const { card } = step;
  const reverse = step.streak > 0; // second recall: meaning → word
  const item = card.item;
  const meaning = item.meaning.ru ?? item.meaning.en;
  const toLearn = queue.length;

  const answer = (remembered: boolean) => {
    haptic("tap");
    recordReview(card.cardId, remembered ? 3 : 1);
    setRevealed(false);
    const rest = queue.slice(1);
    if (remembered && step.streak + 1 >= NEEDED) {
      setLearned((n) => n + 1);
      setQueue(rest);
      if (!rest.length) finish();
      return;
    }
    const moved: Step = { card, streak: remembered ? step.streak + 1 : 0 };
    const at = remembered ? rest.length : Math.min(MISS_GAP, rest.length);
    setQueue([...rest.slice(0, at), moved, ...rest.slice(at)]);
  };

  return (
    <main className="screen">
      <Progress value={1 - toLearn / group.length} label={`Тренировка · осталось ${toLearn}`} card={revealed ? card : undefined} />
      <button className={`card ${revealed ? "revealed" : ""}`} onClick={() => setRevealed(true)} aria-disabled={revealed}>
        {reverse ? (
          <>
            <span className="badge">Вспомни слово · {FLAG[card.lang]}</span>
            <span className="word">{meaning}</span>
            {grammarLabel(item) && <span className="hint small">{grammarLabel(item)}</span>}
            {revealed && (
              <span className="answer">
                <WordHead card={card} noLabel />
              </span>
            )}
          </>
        ) : (
          <>
            <span className="badge">Вспомни значение · {FLAG[card.lang]}</span>
            <WordHead card={card} />
            {revealed && (
              <span className="answer">
                <span className="meaning">{meaning}</span>
              </span>
            )}
          </>
        )}
        {revealed ? <WordDetails card={card} hideMeaning /> : <span className="hint tap">Вспомни и нажми</span>}
      </button>
      <div className="spacer" />
      {revealed ? (
        <div className="ratings two">
          <button className="rate again" onClick={() => answer(false)}>Не помню</button>
          <button className="rate good" onClick={() => answer(true)}>Помню</button>
        </div>
      ) : (
        <button className="button big" onClick={() => setRevealed(true)}>Показать ответ</button>
      )}
    </main>
  );
}

function Progress({ value, label, card }: { value: number; label: string; card?: WordCard }) {
  return (
    <>
      <div className="progress">
        <div className="bar" style={{ width: `${value * 100}%` }} />
      </div>
      <p className="hint small top-line">
        <span>{label}</span>
        {card && <ReportButton key={card.cardId} itemId={card.item.id} cardId={card.cardId} />}
      </p>
    </>
  );
}

/** The word as it is learned: with stress, genitive / 3 forms and the part of speech. */
function WordHead({ card, noLabel }: { card: WordCard; noLabel?: boolean }) {
  const { item } = card;
  const head = item.stress ?? item.text;
  return (
    <>
      <span className="word">{head}</span>
      {item.forms ? <span className="forms">{head} — {item.forms.pres} — {item.forms.past}</span> : item.gen && <span className="gen">{item.gen}</span>}
      {!noLabel && grammarLabel(item) && <span className="hint small">{grammarLabel(item)}</span>}
      <Play id={item.id} kind="word" />
    </>
  );
}

function WordDetails({ card, hideMeaning }: { card: WordCard; hideMeaning?: boolean }) {
  const { item } = card;
  const meaning = item.meaning.ru ?? item.meaning.en;
  const note = item.note?.ru ?? item.note?.en;
  const example = item.examples[0];
  return (
    <span className="answer">
      {!hideMeaning && <span className="meaning">{meaning}</span>}
      {note && <span className="note">💡 {note}</span>}
      {example && (
        <span className="example">
          <i>{example.text} <Play id={item.id} kind="ex" /></i>
          <span className="hint">{example.translation}</span>
        </span>
      )}
    </span>
  );
}
