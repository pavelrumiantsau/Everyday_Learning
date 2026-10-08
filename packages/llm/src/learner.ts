// Language-learning tasks on top of the router: learner profiles, prompt building, output schemas, language guess.
// Shared by the Worker (tutor + feedback) and scripts/llm-eval.ts, so both use exactly the same prompts.
import { z } from "zod";
import type { ChatMessage } from "./types";

export type TargetLang = "lt" | "es" | "fr";

export interface LearnerProfile {
  lang: TargetLang;
  flag: string;
  /** English name, used inside prompts. */
  name: string;
  /** Explanation language for corrections (PLAN §6.1): Russian for Lithuanian, English for Spanish/French. */
  explainIn: "Russian" | "English";
  level: string;
  style: string;
  defaultTopic: string;
}

export const PROFILES: Record<TargetLang, LearnerProfile> = {
  lt: {
    lang: "lt",
    flag: "🇱🇹",
    name: "Lithuanian",
    explainIn: "Russian",
    level: "B1 (between A2 and B1, aiming for B2). Native Russian/Ukrainian/Belarusian speaker, fluent in English",
    style:
      "Write natural B1-level Lithuanian: 2–4 short sentences, everyday vocabulary, occasionally a useful B1–B2 construction " +
      "(frequentative past -davo, future, conditional -čiau, reflexive -si- with prefixes, definite adjectives, prefix aspect).",
    defaultTopic: "everyday life, work and plans",
  },
  es: {
    lang: "es",
    flag: "🇪🇸",
    name: "Spanish",
    explainIn: "English",
    level: "A1 beginner (knows a few hundred words and phrases). Native Russian speaker, fluent in English",
    style:
      "Keep your Spanish VERY simple: 1–3 very short sentences (at most ~8 words each), present tense, ser/estar, gustar, ir a + infinitive, " +
      "the most common words only. If you use a word a beginner may not know, add the English meaning in parentheses.",
    defaultTopic: "introductions, food, the day, travel",
  },
  fr: {
    lang: "fr",
    flag: "🇫🇷",
    name: "French",
    explainIn: "English",
    level: "A0–A1 absolute beginner. Native Russian speaker, fluent in English, learning Spanish",
    style: "Keep your French VERY simple: 1–2 very short sentences, present tense, the most common words; add English meanings in parentheses.",
    defaultTopic: "greetings and survival phrases",
  },
};

/** CEFR level of a colleague's copy (packages/core Profile); null = the owner's original profiles above. */
export type LearnerLevel = "A0" | "A1" | "A2" | "B1" | "B2";

const LEVEL_NAME: Record<LearnerLevel, string> = {
  A0: "A0 absolute beginner",
  A1: "A1 beginner",
  A2: "A2 elementary",
  B1: "B1 intermediate",
  B2: "B2 upper intermediate",
};

/**
 * The AI profile for a language: the owner's original one without a level, else built for the level of a colleague's
 * copy (docs/EXTENSION-PLAN.md §5.4). Colleagues are native Russian speakers; Ukrainian/Belarusian are not assumed.
 */
export function learnerProfileFor(lang: TargetLang, level: LearnerLevel | null): LearnerProfile {
  const base = PROFILES[lang];
  if (level === null) return base;
  const name = base.name;
  const style: Record<LearnerLevel, string> = {
    A0: `Keep your ${name} VERY simple: 1–2 very short sentences, present tense, the most common words; add the meaning of every new word in parentheses (in ${base.explainIn}).`,
    A1: `Keep your ${name} simple: 1–3 short sentences (at most ~8 words each), present tense and the most common words; if you use a word a beginner may not know, add its meaning in parentheses (in ${base.explainIn}).`,
    A2: `Write simple ${name}: 2–3 short sentences, everyday vocabulary, present, past and future tenses; no participles or long clauses.`,
    B1: `Write natural B1-level ${name}: 2–4 short sentences, everyday vocabulary, occasionally a useful B1–B2 construction.`,
    B2: `Write natural B2-level ${name}: 2–4 sentences, varied vocabulary and constructions, as a native speaker would in a relaxed chat.`,
  };
  return {
    ...base,
    level: `${LEVEL_NAME[level]}. Native Russian speaker`,
    style: style[level],
    defaultTopic: level === "A0" || level === "A1" ? "introductions, family, food, the day" : base.defaultTopic,
  };
}

export const isTargetLang = (s: string): s is TargetLang => s === "lt" || s === "es" || s === "fr";

const Mistake = z.object({
  original: z.string().min(1),
  corrected: z.string().min(1),
  explanation: z.string().default(""),
});
export type Mistake = z.infer<typeof Mistake>;

/** Tutor answer: the reply in the target language + corrections of the learner's last message. */
export const TutorReply = z.object({
  reply: z.string().min(1),
  corrections: z.array(Mistake).default([]),
});
export type TutorReply = z.infer<typeof TutorReply>;

/** Writing feedback on a free text. */
export const WritingFeedback = z.object({
  is_target_language: z.boolean().default(true),
  corrected: z.string().default(""),
  mistakes: z.array(Mistake).default([]),
  comment: z.string().default(""),
});
export type WritingFeedback = z.infer<typeof WritingFeedback>;

/** Prompt templates by name ("tutor/chat", "feedback/writing"), bundled from prompts/*.md at build time. */
export type Prompts = Record<string, string>;

export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
}

const profileVars = (p: LearnerProfile) => ({ lang_name: p.name, explain_lang: p.explainIn, level: p.level, style: p.style });

const OPENING = "(Start the conversation: greet me briefly and ask one question about the topic. Nothing to correct yet.)";

export function tutorMessages(prompts: Prompts, p: LearnerProfile, topic: string | undefined, history: ChatMessage[], userText?: string): ChatMessage[] {
  const system = render(need(prompts, "tutor/chat"), { ...profileVars(p), topic: topic || p.defaultTopic });
  const turns: ChatMessage[] = [...history];
  if (userText !== undefined) turns.push({ role: "user", content: userText });
  // The tutor opens the conversation; providers want the first turn to be the user's, so the opening request stands in for it.
  if (turns[0]?.role !== "user") turns.unshift({ role: "user", content: OPENING });
  return [{ role: "system", content: system }, ...turns];
}

export function feedbackMessages(prompts: Prompts, p: LearnerProfile, text: string): ChatMessage[] {
  return [
    { role: "system", content: render(need(prompts, "feedback/writing"), profileVars(p)) },
    { role: "user", content: text },
  ];
}

function need(prompts: Prompts, name: string): string {
  const t = prompts[name];
  if (!t) throw new Error(`prompt ${name} is missing (prompts/${name}.md)`);
  return t;
}

// --- language guess (cheap, no API call) ---

const WORDS: Record<TargetLang, string[]> = {
  lt: ("aš tu jis ji mes jūs jie yra esu esi buvo bus ir kad bet ne taip labas labą ačiū prašau man tau jam kaip kas kur kodėl " +
    "šiandien rytoj vakar noriu nori turiu turi gerai su į iš apie nes dabar labai čia ten mano tavo savo dirbu gyvenu einu " +
    "eina darbe namie namo diena dieną rytą vakare mėgstu galiu reikia buvau būsiu nėra dar jau tik viskas").split(" "),
  es: ("yo soy eres es estoy está estás el los las que y en un una unos por para con pero muy hola gracias tengo tienes quiero " +
    "me mi mis tu hoy bueno buena bien también cómo qué dónde cuándo porque hay ser estar vivo trabajo hablo español mañana " +
    "ayer gusta mucho poco casa amigo amiga del al").split(" "),
  fr: ("je suis es est le les et un une des pour avec mais très bonjour merci j'ai c'est nous vous ils elles au du ne pas " +
    "aujourd'hui demain bien oui moi toi mon ma mes aime habite travaille parle français").split(" "),
};
const EN_WORDS = new Set("the is are and you i to of what how it this that my have do not was with for".split(" "));

/** Guesses whether a text is Lithuanian, Spanish or French; null for Russian/English/unclear text. */
export function detectLang(text: string): TargetLang | null {
  const t = text.toLowerCase();
  const letters = t.match(/\p{L}/gu) ?? [];
  if (letters.length < 4) return null;
  const cyr = letters.filter((c) => /[а-яёіўєї]/.test(c)).length;
  if (cyr / letters.length > 0.3) return null;

  const words = t.match(/[\p{L}']+/gu) ?? [];
  const score: Record<TargetLang, number> = { lt: 0, es: 0, fr: 0 };
  score.lt += 3 * (t.match(/[ąčęėįšųūž]/g)?.length ?? 0);
  score.es += 3 * (t.match(/[ñ¿¡]/g)?.length ?? 0) + (t.match(/[áíóú]/g)?.length ?? 0);
  score.fr += 3 * (t.match(/[àâçèêëîïôûœ]/g)?.length ?? 0);
  if (/é/.test(t)) { score.es += 1; score.fr += 1; }
  let en = 0;
  for (const w of words) {
    for (const l of ["lt", "es", "fr"] as const) if (WORDS[l].includes(w)) score[l] += 2;
    if (EN_WORDS.has(w)) en += 2;
  }
  const ranked = (Object.entries(score) as [TargetLang, number][]).sort((a, b) => b[1] - a[1]);
  const [best, second] = [ranked[0]!, ranked[1]!];
  if (best[1] < 3 || best[1] === second[1] || en > best[1]) return null;
  return best[0];
}

/** Whisper's verbose_json names languages in English ("lithuanian"). */
export function langFromWhisper(name: string | undefined): TargetLang | null {
  const n = (name ?? "").toLowerCase();
  return n === "lithuanian" || n === "lt" ? "lt" : n === "spanish" || n === "es" ? "es" : n === "french" || n === "fr" ? "fr" : null;
}
