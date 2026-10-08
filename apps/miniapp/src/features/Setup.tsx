// Setup wizard of a personal copy (docs/EXTENSION-PLAN.md §5): languages, level and goal, pace, daily rhythm.
// Opens by itself until it is answered (App.tsx), later from the home screen or /setup. Progress is never lost.
import { useEffect, useState } from "react";
import { getProfile, saveProfile, type Lang, type LanguagePlan, type Level, type Pace, type ProfileState } from "../api";
import type { MiniFeature } from "../features";
import { FLAG } from "../flags";
import { haptic } from "../telegram";

const LANGS: Lang[] = ["lt", "es", "fr"];
const NAME: Record<Lang, string> = { lt: "Литовский", es: "Испанский", fr: "Французский" };
const PACE_NAME: Record<Pace, string> = { light: "Спокойно", normal: "Обычно", intensive: "Интенсивно" };
const PACE_TIME: Record<Pace, string> = { light: "до экзамена A2 ≈ 12 мес.", normal: "до экзамена A2 ≈ 8 мес.", intensive: "до экзамена A2 ≈ 5 мес." };

/** Level choices: Lithuanian A0–A2 = foundation course (A0 → A2 exam), B1+ = the existing course. */
const LEVELS: Record<Lang, { level: Level; label: string }[]> = {
  lt: [
    { level: "A0", label: "С нуля" },
    { level: "A1", label: "Знаю основы (A1)" },
    { level: "A2", label: "Уровень A2" },
    { level: "B1", label: "B1 и выше" },
  ],
  es: [
    { level: "A0", label: "С нуля" },
    { level: "A1", label: "Знаю основы" },
    { level: "A2", label: "A2 и выше" },
  ],
  fr: [
    { level: "A0", label: "С нуля" },
    { level: "A1", label: "Знаю основы" },
    { level: "A2", label: "A2 и выше" },
  ],
};

const planFor = (lang: Lang, level: Level, exam: boolean, examDate: string): LanguagePlan =>
  lang !== "lt"
    ? { course: "standard", level }
    : level === "B1" || level === "B2"
      ? { course: "continuing", level }
      : { course: "foundation", level, ...(exam && { exam: { level: "A2" as const, ...(examDate && { date: examDate }) } }) };

const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Vilnius";
  } catch {
    return "Europe/Vilnius";
  }
};

const today = () => new Date().toISOString().slice(0, 10);

function HomeEntry({ open }: { open: () => void }) {
  const [copy, setCopy] = useState(false);
  useEffect(() => {
    getProfile().then((s) => setCopy(s.copy), () => undefined);
  }, []);
  if (!copy) return null; // the original deployment keeps its plan
  return (
    <button className="secondary row" onClick={open}>
      <span>🎯 Языки, уровень и темп</span>
      <span className="hint small">изменить ›</span>
    </button>
  );
}

function Screen({ close }: { close: () => void }) {
  const [state, setState] = useState<ProfileState | null>(null);
  const [step, setStep] = useState(0);
  const [langs, setLangs] = useState<Lang[]>(["lt"]);
  const [main, setMain] = useState<Lang>("lt");
  const [levels, setLevels] = useState<Record<Lang, Level>>({ lt: "A0", es: "A0", fr: "A0" });
  const [exam, setExam] = useState(true);
  const [examDate, setExamDate] = useState("");
  const [pace, setPace] = useState<Pace>("normal");
  const [timezone, setTimezone] = useState(deviceTimezone());
  const [morning, setMorning] = useState("08:00");
  const [evening, setEvening] = useState("20:30");
  const [minAnswers, setMinAnswers] = useState(15);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | string>("idle");

  useEffect(() => {
    getProfile().then((s) => {
      setState(s);
      setMorning(s.rhythm.morning);
      setEvening(s.rhythm.evening);
      setMinAnswers(s.rhythm.min_day_answers);
      const p = s.profile;
      if (!p) return;
      const chosen = LANGS.filter((l) => p.languages[l]);
      setLangs(chosen);
      setMain(p.main);
      setLevels((cur) => ({ ...cur, ...Object.fromEntries(chosen.map((l) => [l, p.languages[l]!.level])) }));
      setExam(!!p.languages.lt?.exam);
      setExamDate(p.languages.lt?.exam?.date ?? "");
      setPace(p.pace);
      setTimezone(p.timezone);
    }, (e) => setStatus(String(e)));
  }, []);

  if (!state) return <main className="screen center hint">{status === "idle" ? "Загрузка…" : status}</main>;
  if (!state.copy) {
    return (
      <main className="screen center">
        <p>В этом боте действует исходный план. Темп и время уроков — в ⚙️ настройках.</p>
        <button className="button" onClick={close}>Назад</button>
      </main>
    );
  }

  const toggle = (l: Lang) => {
    haptic("tap");
    const next = langs.includes(l) ? langs.filter((x) => x !== l) : LANGS.filter((x) => x === l || langs.includes(x));
    setLangs(next);
    if (!next.includes(main) && next[0]) setMain(next[0]);
  };
  const ltFoundation = langs.includes("lt") && levels.lt !== "B1" && levels.lt !== "B2";
  const paceInfo = state.paces[pace];

  const submit = async () => {
    haptic("tap");
    setStatus("saving");
    try {
      await saveProfile({
        profile: {
          version: 1,
          timezone,
          main,
          pace,
          languages: Object.fromEntries(langs.map((l) => [l, planFor(l, levels[l], exam, examDate)])),
          created: state.profile?.created ?? today(),
        },
        morning,
        evening,
        min_day_answers: minAnswers,
      });
      setStatus("done");
    } catch (e) {
      setStatus(`Не сохранилось: ${String(e)}`);
    }
  };

  if (status === "done") {
    return (
      <main className="screen center">
        <h1>Готово ✅</h1>
        <p>{state.profile ? "Настройки сохранены." : "Первый урок уже в чате с ботом. Дальше — каждое утро в " + morning + "."}</p>
        {langs.some((l) => levels[l] !== "A0") && (
          <p className="hint">Если что-то уже знаете — на главном экране «Проверить, что я уже знаю»: известные слова не придут.</p>
        )}
        <button className="button" onClick={close}>Начать</button>
      </main>
    );
  }

  const steps = [
    // 0: languages
    <section key="langs" className="settings-block">
      <h2>Что учим?</h2>
      <div className="chips">
        {LANGS.map((l) => (
          <button key={l} className={`chip ${langs.includes(l) ? "active" : ""}`} onClick={() => toggle(l)}>
            {FLAG[l]} {NAME[l]}
          </button>
        ))}
      </div>
      {langs.length > 1 && (
        <>
          <p className="hint">Главный язык — ему достаётся большая часть новых слов и правил:</p>
          <div className="chips">
            {langs.map((l) => (
              <button key={l} className={`chip ${main === l ? "active" : ""}`} onClick={() => { haptic("tap"); setMain(l); }}>
                {FLAG[l]} {NAME[l]}
              </button>
            ))}
          </div>
        </>
      )}
    </section>,
    // 1: level and goal
    <section key="level" className="settings-block">
      <h2>Уровень</h2>
      {langs.map((l) => (
        <div key={l}>
          <p>{FLAG[l]} {NAME[l]}</p>
          <div className="chips">
            {LEVELS[l].map((o) => (
              <button key={o.level} className={`chip ${levels[l] === o.level ? "active" : ""}`} onClick={() => { haptic("tap"); setLevels({ ...levels, [l]: o.level }); }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {ltFoundation && (
        <div className="settings">
          <label className="setting">
            <span>🇱🇹 Готовлюсь к экзамену A2 (I категория)</span>
            <input type="checkbox" checked={exam} onChange={(e) => setExam(e.target.checked)} />
          </label>
          {exam && (
            <label className="setting">
              <span>Дата экзамена <span className="hint small">(если есть)</span></span>
              <input type="date" value={examDate} min={today()} onChange={(e) => setExamDate(e.target.value)} />
            </label>
          )}
        </div>
      )}
    </section>,
    // 2: pace
    <section key="pace" className="settings-block">
      <h2>Темп</h2>
      {(Object.keys(PACE_NAME) as Pace[]).map((p) => (
        <button key={p} className={`secondary ${pace === p ? "active" : ""}`} onClick={() => { haptic("tap"); setPace(p); }}>
          <span>{pace === p ? "● " : "○ "}{PACE_NAME[p]} — ~{state.paces[p].minutes} мин в день</span>
          <span className="hint small">
            {state.paces[p].main} новых слов в день · {state.paces[p].lessonsPerWeek} правила в неделю
            {ltFoundation && main === "lt" ? ` · ${PACE_TIME[p]}` : ""}
          </span>
        </button>
      ))}
      {ltFoundation && exam && examDate && <ExamHint date={examDate} pace={pace} />}
      <p className="hint small">Плюс 20–30 минут литовского на слух несколько раз в неделю (радио, подкасты) — без этого экзамен по аудированию тяжёлый.</p>
    </section>,
    // 3: rhythm
    <section key="rhythm" className="settings-block">
      <h2>Время</h2>
      <div className="settings">
        <label className="setting">
          <span>Утренний урок</span>
          <input type="time" value={morning} onChange={(e) => setMorning(e.target.value)} />
        </label>
        <label className="setting">
          <span>Вечернее напоминание <span className="hint small">(если день не сделан)</span></span>
          <input type="time" value={evening} onChange={(e) => setEvening(e.target.value)} />
        </label>
        <div className="setting">
          <span>Минимум ответов в день</span>
          <span className="stepper">
            <button onClick={() => setMinAnswers(Math.max(5, minAnswers - 5))} disabled={minAnswers <= 5}>−</button>
            <span className="num-sm">{minAnswers}</span>
            <button onClick={() => setMinAnswers(Math.min(100, minAnswers + 5))} disabled={minAnswers >= 100}>+</button>
          </span>
        </div>
        <label className="setting">
          <span>Часовой пояс</span>
          <input className="text-input" style={{ width: "55%" }} value={timezone} onChange={(e) => setTimezone(e.target.value.trim())} />
        </label>
      </div>
    </section>,
    // 4: summary
    <section key="summary" className="settings-block">
      <h2>Всё верно?</h2>
      <ul className="summary-list">
        {langs.map((l) => (
          <li key={l}>
            {FLAG[l]} {NAME[l]}: {LEVELS[l].find((o) => o.level === levels[l])?.label}
            {l === main && langs.length > 1 ? " · главный" : ""}
            {l === "lt" && ltFoundation ? (exam ? ` · курс до экзамена A2${examDate ? ` (${examDate})` : ""}` : " · курс с нуля до A2") : ""}
          </li>
        ))}
        <li>Темп: {PACE_NAME[pace]} — {paceInfo.main} новых слов в день, {paceInfo.lessonsPerWeek} правила в неделю</li>
        <li>Утренний урок в {morning}, напоминание в {evening} ({timezone})</li>
      </ul>
      {state.profile && <p className="hint small">Прогресс сохранится — меняется только план дальше.</p>}
    </section>,
  ];

  const canNext = step !== 0 || langs.length > 0;
  return (
    <main className="screen">
      <div className="top-line">
        <span className="hint small">Настройка · шаг {step + 1} из {steps.length}</span>
        {state.profile && <button className="link" onClick={close}>Закрыть</button>}
      </div>
      <div className="progress"><div className="bar" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      {steps[step]}
      <div className="spacer" />
      {typeof status === "string" && status.startsWith("Не сохранилось") && <p className="hint small">{status}</p>}
      <div className="row-buttons">
        {step > 0 && <button className="secondary center-text" onClick={() => setStep(step - 1)}>Назад</button>}
        {step < steps.length - 1 ? (
          <button className="button big" disabled={!canNext} onClick={() => { haptic("tap"); setStep(step + 1); }}>Дальше</button>
        ) : (
          <button className="button big" disabled={status === "saving"} onClick={() => void submit()}>
            {status === "saving" ? "Сохраняю…" : state.profile ? "Сохранить" : "Начать"}
          </button>
        )}
      </div>
    </main>
  );
}

/** With an exam date: weeks left vs. what the chosen pace needs (≈ the A2 course length + 6 weeks of exam practice). */
function ExamHint({ date, pace }: { date: string; pace: Pace }) {
  const MONTHS: Record<Pace, number> = { light: 12, normal: 8, intensive: 5 };
  const months = (Date.parse(date) - Date.now()) / (30.4 * 86_400_000);
  if (!(months > 0)) return null;
  const enough = months >= MONTHS[pace];
  const faster = (Object.keys(MONTHS) as Pace[]).find((p) => months >= MONTHS[p]);
  return (
    <p className={`note ${enough ? "" : "warn"}`}>
      До экзамена ≈ {Math.round(months)} мес. {enough
        ? "Этого темпа хватает."
        : faster
          ? `Этому темпу нужно ≈ ${MONTHS[pace]} мес. — подойдёт «${PACE_NAME[faster]}».`
          : "Даже интенсивному темпу нужно ≈ 5 мес. — можно сдать часть на A1 или перенести дату."}
    </p>
  );
}

export const setupFeature: MiniFeature = { id: "setup", HomeEntry, Screen };
