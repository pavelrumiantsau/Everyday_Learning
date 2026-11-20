-- Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md §3): own tables only. Nothing here is read by the original flow
-- (reviews, polls, streaks, reports), and the section never writes to card_state, review_event or activity_day.

-- A block the learner opened, or marked as known (diagnostic or «Я это знаю»).
CREATE TABLE uk_block (
  block_id  TEXT PRIMARY KEY,   -- uk-b-0410
  opened_at INTEGER,            -- epoch ms of «Открыть блок»; NULL = not opened
  known     INTEGER NOT NULL DEFAULT 0, -- 1 = skipped as known
  diag      INTEGER,            -- diagnostic: right answers out of 2; NULL = not tested
  diag_at   INTEGER
);

-- Every answer (practice, mistakes review, diagnostic). `id` comes from the Mini App, so a resend is harmless.
CREATE TABLE uk_answer (
  id          TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,    -- uk-b-0410:x3
  block_id    TEXT NOT NULL,
  correct     INTEGER NOT NULL, -- 1 / 0
  mode        TEXT NOT NULL,    -- learn | review | diag
  answered_at INTEGER NOT NULL
);
CREATE INDEX uk_answer_block ON uk_answer (block_id, answered_at);

-- Exercises answered wrong come back on a schedule (FSRS), in a queue of their own.
CREATE TABLE uk_card (
  exercise_id   TEXT PRIMARY KEY,
  block_id      TEXT NOT NULL,
  due           INTEGER NOT NULL,
  fsrs          TEXT NOT NULL,  -- ts-fsrs Card as JSON
  introduced_at INTEGER NOT NULL
);
CREATE INDEX uk_card_due ON uk_card (due);
