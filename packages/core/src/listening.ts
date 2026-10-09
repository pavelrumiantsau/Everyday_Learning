// Listening practice of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.5): short dialogues and
// announcements with audio (one file per item, voiced by Reginutė) and 3 questions; on the exam the recording plays twice.
// Files: content/lt/listening/*.yaml (a list per file), validated by scripts/build-content.ts. Foundation only.
import { z } from "zod";

export const LISTENING_MAX_PLAYS = 2;

const Question = z
  .object({
    q: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2).max(4),
    answer: z.number().int().min(0),
  })
  .superRefine((q, ctx) => {
    if (q.answer >= q.options.length) ctx.addIssue({ code: "custom", path: ["answer"], message: "answer must be an index into options" });
  });

export const Listening = z.object({
  id: z.string().regex(/^lt-l-\d{4}$/, "id must look like lt-l-0001"),
  kind: z.enum(["dialogue", "announcement", "message"]),
  cefr: z.enum(["A1", "A2"]),
  track: z.literal("foundation"),
  /** Lithuanian. */
  title: z.string().trim().min(1),
  /** Russian: where you are and what you hear, as the exam says before playing. */
  situation: z.string().trim().min(5),
  /** One line per turn; `speaker` is a short label shown with the transcript (A, B, «Pardavėja»…). */
  lines: z.array(z.object({ speaker: z.string().trim().min(1).max(20), text: z.string().trim().min(1) })).min(1).max(14),
  questions: z.array(Question).length(3),
});
export type Listening = z.infer<typeof Listening>;
export const ListeningFile = z.array(Listening);

/** What is spoken: the lines one after another (the voice pauses at sentence ends). */
export const listeningSpeech = (l: Pick<Listening, "lines">) => l.lines.map((x) => x.text).join(" ");
