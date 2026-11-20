// Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md): blocks opened on demand, practice sessions, a mistakes queue
// of its own, a diagnostic, part tests, a cheat sheet and search. Mini App API only — no commands, no messages, no
// schedule — and its own tables (migrations 0014_ukrainian.sql, 0015_uk_part.sql), so the original flow (reviews,
// polls, streaks, reports) never sees it.
// The owner's deployment only: personal copies get 404.
import {
  diagnosticPicks,
  isMastered,
  matchesQuery,
  needsRefresh,
  newCard,
  parseUkExerciseId,
  partTestScore,
  pickPartTest,
  pickSession,
  REFRESH_PER_BLOCK,
  reviewQuiz,
  UK_PARTS,
  ukExerciseId,
  ukPartOf,
  type ExerciseStat,
  type UkBlock,
  type UkBlockStatus,
} from "@el/core";
import { Hono, type MiddlewareHandler } from "hono";
import { UK_BLOCK_BY_ID, UK_BLOCKS, UK_CHEATSHEET } from "../content";
import type { Feature } from "../feature";
import { isCopy } from "../owner";

/** learn: block practice; review: «Повторить ошибки»; diag: diagnostic (no progress, no cards); test: part test. */
const MODES = ["learn", "review", "diag", "test"] as const;
type Mode = (typeof MODES)[number];
/** At most this many «come back» exercises of mastered blocks at a time. */
const REFRESH_LIMIT = 10;

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

/** Progress of every block, plus the time of its latest practice answer (for the «come back» rule of mastered blocks). */
async function overview(d1: D1Database): Promise<{ rows: Map<string, BlockRow>; byBlock: Map<string, Progress & { lastAt: number | null }> }> {
  const [rows, answered, recent] = await Promise.all([
    blockRows(d1),
    d1
      .prepare("SELECT block_id, COUNT(DISTINCT exercise_id) AS n, MAX(answered_at) AS last FROM uk_answer WHERE mode != 'diag' GROUP BY block_id")
      .all<{ block_id: string; n: number; last: number }>(),
    d1
      .prepare(
        "SELECT block_id, correct FROM (SELECT block_id, correct, ROW_NUMBER() OVER (PARTITION BY block_id ORDER BY answered_at DESC, id DESC) AS rn FROM uk_answer WHERE mode != 'diag') WHERE rn <= 20 ORDER BY block_id, rn",
      )
      .all<{ block_id: string; correct: number }>(),
  ]);
  const answeredBy = new Map(answered.results.map((r) => [r.block_id, r]));
  const recentBy = new Map<string, boolean[]>();
  for (const r of recent.results) recentBy.set(r.block_id, [...(recentBy.get(r.block_id) ?? []), r.correct === 1]);
  const byBlock = new Map(
    UK_BLOCKS.map((b) => {
      const a = answeredBy.get(b.id);
      return [b.id, { ...progressOf(b, rows.get(b.id), a?.n ?? 0, recentBy.get(b.id) ?? []), lastAt: a?.last ?? null }];
    }),
  );
  return { rows, byBlock };
}

/** Mastered blocks not practised for REFRESH_AFTER_DAYS: they come back with a few exercises in «Повторить ошибки». */
const staleBlocks = (byBlock: Map<string, Progress & { lastAt: number | null }>, now: number) =>
  UK_BLOCKS.filter((b) => {
    const p = byBlock.get(b.id)!;
    return needsRefresh(p.status === "mastered", p.lastAt, now);
  });

/** The map: 13 parts with their blocks, progress and part tests; the mistakes due now; how far the diagnostic got. */
api.get("/uk", async (c) => {
  const d1 = c.env.DB;
  const now = Date.now();
  const [{ rows, byBlock }, due, mistakes, tests] = await Promise.all([
    overview(d1),
    d1.prepare("SELECT COUNT(*) AS n FROM uk_card WHERE due <= ?").bind(now).first<number>("n"),
    d1.prepare("SELECT COUNT(*) AS n FROM uk_card").first<number>("n"),
    d1.prepare("SELECT part, best, passed_at FROM uk_part").all<{ part: number; best: number; passed_at: number | null }>(),
  ]);
  const testBy = new Map(tests.results.map((t) => [t.part, t]));
  const parts = UK_PARTS.map((title, i) => {
    const t = testBy.get(i + 1);
    return {
      part: i + 1,
      title,
      test: t ? { best: t.best, passed: t.passed_at !== null } : null,
      blocks: UK_BLOCKS.filter((b) => b.part === i + 1).map((b) => {
        const { lastAt: _, ...progress } = byBlock.get(b.id)!;
        return { id: b.id, title: b.title, level: b.level, source: b.source, exercises: b.exercises.length, ...progress };
      }),
    };
  });
  const tested = UK_BLOCKS.filter((b) => rows.get(b.id)?.diag != null).length;
  const refresh = Math.min(staleBlocks(byBlock, now).length * REFRESH_PER_BLOCK, REFRESH_LIMIT);
  return c.json({ parts, due: (due ?? 0) + refresh, mistakes: mistakes ?? 0, refresh, diagnostic: { tested, total: UK_BLOCKS.length } });
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

/**
 * «Повторить ошибки»: exercises answered wrong whose time has come, oldest first; then, from mastered blocks not
 * practised for REFRESH_AFTER_DAYS, the REFRESH_PER_BLOCK exercises answered longest ago (answering them resets the clock).
 */
api.get("/uk/review", async (c) => {
  const d1 = c.env.DB;
  const now = Date.now();
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 20, 1), 100);
  const { results } = await d1.prepare("SELECT exercise_id FROM uk_card WHERE due <= ? ORDER BY due LIMIT ?").bind(now, limit).all<{ exercise_id: string }>();
  const ids = results.map((r) => r.exercise_id);
  if (ids.length < limit) {
    const { byBlock } = await overview(d1);
    for (const block of staleBlocks(byBlock, now).slice(0, Math.ceil(REFRESH_LIMIT / REFRESH_PER_BLOCK))) {
      const stats = exerciseStats(await blockAnswers(d1, block.id));
      const oldest = [...stats].sort(([, a], [, b]) => a.lastAt - b.lastAt).slice(0, REFRESH_PER_BLOCK);
      for (const [i] of oldest) {
        const id = ukExerciseId(block.id, i);
        if (!ids.includes(id) && ids.length < limit) ids.push(id);
      }
    }
  }
  const cards = ids.flatMap((id) => {
    const ref = parseUkExerciseId(id);
    const block = ref && UK_BLOCK_BY_ID.get(ref.blockId);
    const exercise = block?.exercises[ref!.index];
    return block && exercise ? [{ id, blockId: block.id, blockTitle: block.title, strict: block.strict, exercise }] : [];
  });
  return c.json({ cards });
});

/** «Контрольная части»: PART_TEST_SIZE exercises from all blocks of the part, blocks taking turns, in random order. */
api.get("/uk/parts/:part/test", (c) => {
  const part = Number(c.req.param("part"));
  const blocks = UK_BLOCKS.filter((b) => b.part === part);
  if (!blocks.length) return c.json({ error: "no blocks in this part" }, 404);
  const items = pickPartTest(blocks.map((b) => b.exercises.length)).map(([b, i]) => ({
    id: ukExerciseId(blocks[b]!.id, i),
    blockTitle: blocks[b]!.title,
    exercise: blocks[b]!.exercises[i]!,
  }));
  return c.json({ part, title: UK_PARTS[part - 1], items });
});

/** Part test result: the best score is kept; ≥ PART_TEST_PASS passes the part (once passed, it stays passed). */
api.post("/uk/parts/:part/test", async (c) => {
  const part = Number(c.req.param("part"));
  if (!UK_BLOCKS.some((b) => b.part === part)) return c.json({ error: "no blocks in this part" }, 404);
  const body = await c.req.json<{ correct?: unknown; total?: unknown }>().catch(() => ({}) as { correct?: unknown; total?: unknown });
  const { correct, total } = body;
  if (typeof correct !== "number" || typeof total !== "number" || !Number.isInteger(correct) || !Number.isInteger(total) || total < 1 || total > 100 || correct < 0 || correct > total) {
    return c.json({ error: "correct and total: integers, 0 ≤ correct ≤ total ≤ 100" }, 400);
  }
  const { score, passed } = partTestScore(correct, total);
  await c.env.DB.prepare(
    "INSERT INTO uk_part (part, best, passed_at) VALUES (?, ?, ?) ON CONFLICT (part) DO UPDATE SET best = MAX(best, excluded.best), passed_at = COALESCE(passed_at, excluded.passed_at)",
  )
    .bind(part, score, passed ? Date.now() : null)
    .run();
  const row = await c.env.DB.prepare("SELECT best, passed_at FROM uk_part WHERE part = ?").bind(part).first<{ best: number; passed_at: number | null }>();
  return c.json({ score, passed, best: row?.best ?? score, partPassed: row?.passed_at != null });
});

/** «Шпаргалка»: the course's 15 key rules, each with its blocks (title and status). */
api.get("/uk/cheatsheet", async (c) => {
  const { byBlock } = await overview(c.env.DB);
  const rules = UK_CHEATSHEET.map((r) => ({
    rule: r.rule,
    example: r.example,
    blocks: r.blocks.map((id) => ({ id, title: UK_BLOCK_BY_ID.get(id)!.title, status: byBlock.get(id)!.status })),
  }));
  return c.json({ rules });
});

/** Search over block titles, rules, tables, typical mistakes and examples (case, stress marks, apostrophe form ignored). */
api.get("/uk/search", (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json({ blocks: [] });
  const text = (b: UkBlock) => [b.title, b.rule, ...b.tables.flatMap((t) => [t.caption ?? "", ...t.head, ...t.rows.flat()]), ...b.pairs.flatMap((p) => [p.wrong, p.right]), ...b.examples.map((e) => e.text)].join("\n");
  const blocks = UK_BLOCKS.filter((b) => matchesQuery(text(b), q))
    .slice(0, 30)
    .map((b) => ({ id: b.id, title: b.title, part: b.part, source: b.source }));
  return c.json({ blocks });
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
