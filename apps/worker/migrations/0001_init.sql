-- Current spaced-repetition state per card (one row per item+direction).
CREATE TABLE card_state (
  card_id       TEXT PRIMARY KEY,          -- e.g. "lt-w-0001:recog"
  item_id       TEXT NOT NULL,
  lang          TEXT NOT NULL,
  due           INTEGER NOT NULL,          -- epoch ms
  fsrs          TEXT NOT NULL,             -- ts-fsrs Card as JSON
  introduced_at INTEGER NOT NULL
);
CREATE INDEX idx_card_state_due ON card_state(due);

-- Append-only log of every answer; card_state can be rebuilt from it.
CREATE TABLE review_event (
  id          TEXT PRIMARY KEY,
  card_id     TEXT NOT NULL,
  rating      INTEGER NOT NULL,            -- 1 Again, 2 Hard, 3 Good, 4 Easy
  reviewed_at INTEGER NOT NULL,
  source      TEXT NOT NULL                -- "poll" now, "miniapp" from weeks 2–3
);
CREATE INDEX idx_review_event_time ON review_event(reviewed_at);

-- Which Telegram quiz poll asks about which card.
CREATE TABLE poll_map (
  poll_id        TEXT PRIMARY KEY,
  card_id        TEXT NOT NULL,
  correct_option INTEGER NOT NULL,
  sent_at        INTEGER NOT NULL,
  answered_at    INTEGER
);

-- One row per local day: streaks, and "should the evening reminder fire?".
CREATE TABLE activity_day (
  day          TEXT PRIMARY KEY,           -- local date, e.g. "2026-10-01"
  reviews      INTEGER NOT NULL DEFAULT 0,
  new_cards    INTEGER NOT NULL DEFAULT 0,
  morning_sent INTEGER NOT NULL DEFAULT 0,
  evening_sent INTEGER NOT NULL DEFAULT 0
);
