-- Colleagues' Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.5): writing tasks and speaking situations.
-- New table only; the original bot never writes to it.
CREATE TABLE task_attempt (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    TEXT NOT NULL,      -- lt-t-0001 / lt-s-0001 (content/lt/tasks)
  score      INTEGER NOT NULL,   -- 0–3, exam scale
  created_at INTEGER NOT NULL
);
CREATE INDEX task_attempt_task ON task_attempt (task_id);
