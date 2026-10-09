-- Colleagues' Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.5): mock exams in the NŠA format.
-- New table only; the original bot never writes to it. One row per attempt, each part saved (JSON) when it is done.
CREATE TABLE exam_attempt (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id     TEXT NOT NULL,      -- lt-x-0001 (content/lt/exams)
  started_at  INTEGER NOT NULL,
  rw          TEXT,               -- reading and writing: points, answers, writing scores
  listening   TEXT,               -- points and answers
  speaking    TEXT,               -- situation scores 0–3
  finished_at INTEGER             -- when all three parts are done
);
CREATE INDEX exam_attempt_exam ON exam_attempt (exam_id);
