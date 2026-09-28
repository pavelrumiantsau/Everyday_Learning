-- Quarterly self-check: which can-do statements the learner ticked.
CREATE TABLE assessment (
  poll_id    TEXT PRIMARY KEY,
  quarter    TEXT NOT NULL,
  lang       TEXT NOT NULL,
  options    TEXT NOT NULL,      -- JSON array of can-do statements (poll options, in order)
  selected   TEXT,               -- JSON array of selected option indexes; null until answered
  sent_at    INTEGER NOT NULL,
  answered_at INTEGER
);
