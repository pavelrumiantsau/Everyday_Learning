-- Placement test answers: which upcoming items the learner already knew.
CREATE TABLE placement (
  item_id   TEXT PRIMARY KEY,
  known     INTEGER NOT NULL,   -- 1 knew it, 0 didn't
  placed_at INTEGER NOT NULL
);
