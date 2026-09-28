-- Grammar lessons ("rule of the day").
-- Which lesson is the rule of a local day, and whether the morning message was sent (guards against double sends).
CREATE TABLE grammar_day (
  day       TEXT PRIMARY KEY,   -- local date, e.g. "2026-10-05"
  lesson_id TEXT NOT NULL,      -- e.g. "lt-g-0001"
  sent_at   INTEGER             -- epoch ms of the "📘 Правило дня" message; NULL = not sent yet
);

-- Lessons marked done in the Mini App; their exercises become cloze cards in card_state.
CREATE TABLE grammar_done (
  lesson_id TEXT PRIMARY KEY,
  done_at   INTEGER NOT NULL
);
