-- Colleagues' Lithuanian foundation course (docs/EXTENSION-PLAN.md §6.3): best unit-check result per unit.
-- New table only; the original bot never writes to it.
CREATE TABLE course_check (
  unit_id    TEXT PRIMARY KEY,   -- e.g. "u01" (content/lt/course/foundation.yaml)
  best       INTEGER NOT NULL,   -- best score in %
  last       INTEGER NOT NULL,   -- last score in %
  checked_at INTEGER NOT NULL
);
