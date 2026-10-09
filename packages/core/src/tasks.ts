// Writing tasks and speaking situations of the Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.5): the learner
// answers in the bot chat (text or voice), the AI scores the answer on the exam's 0–3 scale against the checklist.
// Files: content/lt/tasks/*.yaml (a list per file), validated by scripts/build-content.ts. Foundation only.
import { z } from "zod";

export const TASK_KINDS = ["writing", "speaking"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const Task = z
  .object({
    /** lt-t-0001 writing, lt-s-0001 speaking. Stable: attempts are stored by it. */
    id: z.string().regex(/^lt-(t|s)-\d{4}$/, "id must look like lt-t-0001 or lt-s-0001"),
    kind: z.enum(TASK_KINDS),
    cefr: z.enum(["A1", "A2"]),
    track: z.literal("foundation"),
    /** Russian, short, for lists. */
    title: z.string().trim().min(1).max(80),
    /** Russian: the situation and what to do, as an exam task describes it. */
    situation: z.string().trim().min(10),
    /** Lithuanian: the instruction as the exam would give it. */
    prompt: z.string().trim().min(5),
    /** Writing: words expected, e.g. [25, 40]. */
    words: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
    /** Russian: what the answer must contain (2–5 points); the AI checks each. */
    checklist: z.array(z.string().trim().min(3).max(120)).min(2).max(5),
    /** Lithuanian model answer, shown after the attempt. */
    example: z.string().trim().min(10),
  })
  .superRefine((t, ctx) => {
    if ((t.kind === "writing") !== t.id.startsWith("lt-t-")) ctx.addIssue({ code: "custom", path: ["id"], message: "writing tasks are lt-t-…, speaking lt-s-…" });
    if (t.kind === "writing" && !t.words) ctx.addIssue({ code: "custom", path: ["words"], message: "writing tasks need a word range" });
    if (t.words && t.words[0] > t.words[1]) ctx.addIssue({ code: "custom", path: ["words"], message: "word range must be [min, max]" });
  });
export type Task = z.infer<typeof Task>;
export const TaskFile = z.array(Task);

/** Exam scale for one task (speaking situation 0–3; used for writing too). */
export const TASK_MAX_SCORE = 3;
