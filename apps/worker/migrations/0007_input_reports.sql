-- Passive input log (listening/reading outside the app) and learner reports about wrong content.
CREATE TABLE input_log (
  id        TEXT PRIMARY KEY,
  day       TEXT NOT NULL,        -- local date
  lang      TEXT NOT NULL,
  kind      TEXT NOT NULL,        -- podcast, video, radio, reading, conversation, other
  minutes   INTEGER NOT NULL,
  title     TEXT,
  logged_at INTEGER NOT NULL
);
CREATE INDEX idx_input_log_day ON input_log(day);

CREATE TABLE report (
  id          TEXT PRIMARY KEY,
  item_id     TEXT,               -- null for a free-text report from the bot
  card_id     TEXT,
  text        TEXT,
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER
);
