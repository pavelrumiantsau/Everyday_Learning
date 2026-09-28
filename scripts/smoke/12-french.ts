import { audioPath, lessonAudioId } from "../../packages/core/src/audio.ts";
import type { Smoke } from "./context.ts";

// French sounds track: lessons in English, Saturday rotation (unit-tested in core), dictation audio, cloze cards.
export default async function (t: Smoke) {
  const { check, api, me, base } = t;
  type Lesson = { id: string; title: string; explanation: { en?: string; ru?: string }; exercises: { answer: string }[] };

  const all = ((await (await api("/grammar/diagnostic?lang=fr", me)).json()) as { lessons: { id: string }[] }).lessons;
  // On a Saturday, 05-grammar has already done fr-g-0001 (the rule of the day), so this file works with fr-g-0002.
  check(all.length >= 9 && all.some((l) => l.id === "fr-g-0002"), `French sounds lessons are listed (${all.length})`);

  const res = (await (await api("/grammar/lessons/fr-g-0002", me)).json()) as { lesson: Lesson; done: boolean };
  check(!!res.lesson.explanation.en && !res.lesson.explanation.ru, "French lessons are explained in English");

  const mp3 = await fetch(`${base}${audioPath(lessonAudioId("fr-g-0002", "x", 0), "word")}`);
  check(mp3.ok && (mp3.headers.get("content-type") ?? "").startsWith("audio/") && (await mp3.arrayBuffer()).byteLength > 1000,
    "a dictation exercise has its sentence audio");

  const done = (await (await api("/grammar/lessons/fr-g-0002/done", me, { method: "POST", body: "{}" })).json()) as { created: number };
  check(done.created === res.lesson.exercises.length, "finishing a French lesson adds its exercises as cloze cards");
  const { cards } = (await (await api("/queue?limit=300", me)).json()) as { cards: { cardId: string; kind: string; lang?: string }[] };
  check(cards.some((c) => c.cardId === "fr-g-0002:cloze1" && c.kind === "cloze" && c.lang === "fr"), "French cloze cards come in reviews");
}
