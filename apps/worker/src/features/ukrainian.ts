// Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md): blocks opened on demand, practice sessions, a mistakes queue
// of its own and a diagnostic. Mini App API only — no commands, no messages, no schedule — and its own tables
// (migration 0014_ukrainian.sql), so the original flow (reviews, polls, streaks, reports) never sees it.
// The owner's deployment only: personal copies get 404.
import {
  diagnosticPicks,
  isMastered,
  newCard,
  parseUkExerciseId,
  pickSession,
  reviewQuiz,
  UK_PARTS,
  ukExerciseId,
  ukPartOf,
  type ExerciseStat,
  type UkBlock,
  type UkBlockStatus,
} from "@el/core";
import { Hono, type MiddlewareHandler } from "hono";
import { UK_BLOCK_BY_ID, UK_BLOCKS } from "../content";
import type { Feature } from "../feature";
import { isCopy } from "../owner";

const MODES = ["learn", "review", "diag"] as const;
type Mode = (typeof MODES)[number];

// --- storage (migration 0014_ukrainian.sql) ---

interface BlockRow { block_id: string; opened_at: number | null; known: number; diag: number | null }
interface AnswerRow { exercise_id: string; correct: number; answered_at: number }

async function blockRows(d1: D1Database): Promise<Map<string, BlockRow>> {
  const { results } = await d1.prepare("SELECT block_id, opened_at, known, diag FROM uk_block").all<BlockRow>();
  return new Map(results.map((r) => [r.block_id, r]));
}

/** Practice and review answers of a block, oldest first (diagnostic answers don't count toward progress). */
async function blockAnswers(d1: D1Database, blockId: string): Promise<AnswerRow[]> {
  const { results } = await d1
    .prepare("SELECT exercise_id, correct, answered_at FROM uk_answer WHERE block_id = ? AND mode != 'diag' ORDER BY answered_at, id")
    .bind(blockId)
    .all<AnswerRow>();
  return results;
}

/** Per exercise index: how often answered, and the latest result. */
function exerciseStats(answers: readonly AnswerRow[]): Map<number, ExerciseStat> {
  const stats = new Map<number, ExerciseStat>();
  for (const a of answers) {
    const ref = parseUkExerciseId(a.exercise_id);
    if (!ref) continue;
    const prev = stats.get(ref.index);
    stats.set(ref.index, { answers: (prev?.answers ?? 0) + 1, lastCorrect: a.correct === 1, lastAt: a.answered_at });
  }
  return stats;
}

interface Progress { status: UkBlockStatus; answered: number; recent: number | null; diag: number | null }

function progressOf(block: UkBlock, row: BlockRow | undefined, answered: number, recent: readonly boolean[]): Progress {
  const mastered = isMastered(block.exercises.length, answered, recent);
  const status: UkBlockStatus = row?.known ? "known" : mastered ? "mastered" : row?.opened_at || answered ? "open" : "closed";
  const window = recent.slice(0, 20);
  return { status, answered, recent: window.length ? window.filter(Boolean).length / window.length : null, diag: row?.diag ?? null };
}

// --- Mini App API ---

const api = new Hono<{ Bindings: Env }>();

const ownerOnly: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (isCopy(c.env)) return c.json({ error: "not found" }, 404);
  await next();
};
api.use("/uk", ownerOnly);
api.use("/uk/*", ownerOnly);

/** The map: 13 parts with their blocks and progress, the mistakes due now and how far the diagnostic got. */
api.get("/uk", async (c) => {
  const d1 = c.env.DB;
  const now = Date.now();
  const [rows, answered, recent, due, mistakes] = await Promise.all([
    blockRows(d1),
    d1.prepare("SELECT block_id, COUNT(DISTINCT exercise_id) AS n FROM uk_answer WHERE mode != 'diag' GROUP BY block_id").all<{ block_id: string; n: number }>(),
    d1
      .prepare(
        "SELECT block_id, correct FROM (SELECT block_id, correct, ROW_NUMBER() OVER (PARTITION BY block_id ORDER BY answered_at DESC, id DESC) AS rn FROM uk_answer WHERE mode != 'diag') WHERE rn <= 20 ORDER BY block_id, rn",
      )
      .all<{ block_id: string; correct: number }>(),
    d1.prepare("SELECT COUNT(*) AS n FROM uk_card WHERE due <= ?").bind(now).first<number>("n"),
    d1.prepare("SELECT COUNT(*) AS n FROM uk_card").first<number>("n"),
  ]);
  const answeredBy = new Map(answered.results.map((r) => [r.block_id, r.n]));
  const recentBy = new Map<string, boolean[]>();
  for (const r of recent.results) recentBy.set(r.block_id, [...(recentBy.get(r.block_id) ?? []), r.correct === 1]);
  const parts = UK_PARTS.map((title, i) => ({
    part: i + 1,
    title,
    blocks: UK_BLOCKS.filter((b) => b.part === i + 1).map((b) => ({
      id: b.id,
      title: b.title,
      level: b.level,
      source: b.source,
      exercises: b.exercises.length,
      ...progressOf(b, rows.get(b.id), answeredBy.get(b.id) ?? 0, recentBy.get(b.id) ?? []),
    })),
  }));
  const tested = UK_BLOCKS.filter((b) => rows.get(b.id)?.diag != null).length;
  return c.json({ parts, due: due ?? 0, mistakes: mistakes ?? 0, diagnostic: { tested, total: UK_BLOCKS.length } });
});

/** One block: content, progress, the next practice session (exercise indices) and the exercises last answered wrong. */
api.get("/uk/blocks/:id", async (c) => {
  const block = UK_BLOCK_BY_ID.get(c.req.param("id"));
  if (!block) return c.json({ error: "unknown block" }, 404);
  const [rows, answers] = await Promise.all([blockRows(c.env.DB), blockAnswers(c.env.DB, block.id)]);
  const stats = exerciseStats(answers);
  const recent = answers.map((a) => a.correct === 1).reverse();
  const size = Math.min(Math.max(Number(c.req.query("size")) || 10, 1), 40);
  return c.json({
    block,
    progress: progressOf(block, rows.get(block.id), stats.size, recent),
    session: pickSession(block.exercises.length, stats, size),
    wrong: [...stats].filter(([, s]) => !s.lastCorrect).map(([i]) => i).sort((a, b) => a - b),
  });
});

/** «Открыть блок» (also undoes «знаю»: the learner wants to practise it after all). */
api.post("/uk/blocks/:id/open", async (c) => {
  const block = UK_BLOCK_BY_ID.get(c.req.param("id"));
  if (!block) return c.json({ error: "unknown block" }, 404);
  await c.env.DB.prepare(
    "INSERT INTO uk_block (block_id, opened_at) VALUES (?, ?) ON CONFLICT (block_id) DO UPDATE SET opened_at = COALESCE(opened_at, excluded.opened_at), known = 0",
  )
    .bind(block.id, Date.now())
    .run();
  return c.json({ ok: true });
});

/** «Я это знаю»: skip the block (it stays on the map and can be opened later). */
api.post("/uk/blocks/:id/known", async (c) => {
  const block = UK_BLOCK_BY_ID.get(c.req.param("id"));
  if (!block) return c.json({ error: "unknown block" }, 404);
  await c.env.DB.prepare("INSERT INTO uk_block (block_id, known) VALUES (?, 1) ON CONFLICT (block_id) DO UPDATE SET known = 1").bind(block.id).run();
  return c.json({ ok: true });
});

/**
 * Answers from the Mini App (sent in batches, kept on the device until confirmed; a resent id is ignored).
 * Practice and review answers drive the mistakes queue: a wrong answer adds the exercise, later answers reschedule it.
 */
api.post("/uk/answers", async (c) => {
  const body = await c.req.json<{ answers?: unknown }>().catch(() => ({}) as { answers?: unknown });
  if (!Array.isArray(body.answers) || body.answers.length > 200) return c.json({ error: "answers: a list of up to 200" }, 400);
  const d1 = c.env.DB;
  const now = Date.now();
  let saved = 0;
  for (const raw of body.answers as { id?: unknown; exercise?: unknown; correct?: unknown; mode?: unknown; at?: unknown }[]) {
    const ref = typeof raw.exercise === "string" ? parseUkExerciseId(raw.exercise) : null;
    const block = ref && UK_BLOCK_BY_ID.get(ref.blockId);
    if (!ref || !block?.exercises[ref.index] || typeof raw.id !== "string" || !raw.id || typeof raw.correct !== "boolean" || !MODES.includes(raw.mode as Mode)) {
      return c.json({ error: "bad answer", answer: raw }, 400);
    }
    const at = typeof raw.at === "number" && raw.at > 0 && raw.at <= now ? raw.at : now;
    const exerciseId = ukExerciseId(block.id, ref.index);
    const inserted = await d1
      .prepare("INSERT OR IGNORE INTO uk_answer (id, exercise_id, block_id, correct, mode, answered_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(raw.id.slice(0, 64), exerciseId, block.id, raw.correct ? 1 : 0, raw.mode, at)
      .run();
    if (inserted.meta.changes !== 1) continue; // sent before
    saved++;
    if (raw.mode === "diag") continue;
    const card = await d1.prepare("SELECT fsrs FROM uk_card WHERE exercise_id = ?").bind(exerciseId).first<string>("fsrs");
    if (card) {
      const next = reviewQuiz(JSON.parse(card), new Date(at), raw.correct);
      await d1.prepare("UPDATE uk_card SET due = ?, fsrs = ? WHERE exercise_id = ?").bind(next.due.getTime(), JSON.stringify(next), exerciseId).run();
    } else if (!raw.correct) {
      const next = reviewQuiz(newCard(new Date(at)), new Date(at), false);
      await d1
        .prepare("INSERT OR IGNORE INTO uk_card (exercise_id, block_id, due, fsrs, introduced_at) VALUES (?, ?, ?, ?, ?)")
        .bind(exerciseId, block.id, next.due.getTime(), JSON.stringify(next), at)
        .run();
    }
  }
  return c.json({ saved });
});

/** «Повторить ошибки»: exercises answered wrong whose time has come, oldest first. */
api.get("/uk/review", async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 20, 1), 100);
  const { results } = await c.env.DB.prepare("SELECT exercise_id FROM uk_card WHERE due <= ? ORDER BY due LIMIT ?")
    .bind(Date.now(), limit)
    .all<{ exercise_id: string }>();
  const cards = results.flatMap((r) => {
    const ref = parseUkExerciseId(r.exercise_id);
    const block = ref && UK_BLOCK_BY_ID.get(ref.blockId);
    const exercise = block?.exercises[ref!.index];
    return block && exercise ? [{ id: r.exercise_id, blockId: block.id, blockTitle: block.title, strict: block.strict, exercise }] : [];
  });
  return c.json({ cards });
});

/** Diagnostic for one part: two exercises per block (the first and the middle one). */
api.get("/uk/diagnostic", async (c) => {
  const part = Number(c.req.query("part"));
  if (!Number.isInteger(part) || part < 1 || part > UK_PARTS.length) return c.json({ error: "part: 1–13" }, 400);
  const rows = await blockRows(c.env.DB);
  const blocks = UK_BLOCKS.filter((b) => ukPartOf(b.id) === part).map((b) => ({
    id: b.id,
    title: b.title,
    diag: rows.get(b.id)?.diag ?? null,
    exercises: diagnosticPicks(b.exercises.length).map((i) => ({ id: ukExerciseId(b.id, i), exercise: b.exercises[i]! })),
  }));
  return c.json({ part, title: UK_PARTS[part - 1], blocks });
});

/**
 * Diagnostic results: `correct` of 2 per block. Both right → the block is marked known (it can still be opened);
 * otherwise it stays as it was and the map recommends it.
 */
api.post("/uk/diagnostic", async (c) => {
  const body = await c.req.json<{ results?: unknown }>().catch(() => ({}) as { results?: unknown });
  if (!Array.isArray(body.results)) return c.json({ error: "results: a list" }, 400);
  const now = Date.now();
  const stmts: D1PreparedStatement[] = [];
  for (const r of body.results as { block?: unknown; correct?: unknown }[]) {
    const block = typeof r.block === "string" ? UK_BLOCK_BY_ID.get(r.block) : undefined;
    const max = block ? diagnosticPicks(block.exercises.length).length : 0;
    if (!block || typeof r.correct !== "number" || !Number.isInteger(r.correct) || r.correct < 0 || r.correct > max) {
      return c.json({ error: "bad result", result: r }, 400);
    }
    const known = r.correct === max ? 1 : 0;
    stmts.push(
      c.env.DB.prepare(
        "INSERT INTO uk_block (block_id, known, diag, diag_at) VALUES (?, ?, ?, ?) ON CONFLICT (block_id) DO UPDATE SET diag = excluded.diag, diag_at = excluded.diag_at, known = MAX(known, excluded.known)",
      ).bind(block.id, known, r.correct, now),
    );
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ saved: stmts.length });
});

export const ukrainian: Feature = { id: "ukrainian", api };
