-- AI layer: usage log (cost/limits), tutor chat sessions, and the learner's mistakes.

-- One row per provider call (successful or not). No request/response text is stored here.
CREATE TABLE llm_usage (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  at            INTEGER NOT NULL,          -- epoch ms
  task          TEXT NOT NULL,             -- e.g. tutor_chat, writing_feedback, transcribe
  provider      TEXT NOT NULL,             -- groq, google, anthropic…
  model         TEXT NOT NULL,
  ok            INTEGER NOT NULL,          -- 1 answered, 0 failed
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  audio_seconds REAL NOT NULL DEFAULT 0,
  cost_usd      REAL NOT NULL DEFAULT 0,   -- estimate from config/llm.yaml list prices
  latency_ms    INTEGER NOT NULL DEFAULT 0,
  error         TEXT                       -- short summary (status/code), never user text
);
CREATE INDEX idx_llm_usage_provider_at ON llm_usage(provider, at);

-- A /tutor conversation. At most one is open (ended_at IS NULL).
CREATE TABLE tutor_session (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lang        TEXT NOT NULL,               -- lt, es, fr
  topic       TEXT,
  started_at  INTEGER NOT NULL,
  last_at     INTEGER NOT NULL,            -- last message; sessions idle for hours end by themselves
  ended_at    INTEGER
);

-- Conversation turns, the last ~10 exchanges are sent as context.
CREATE TABLE tutor_turn (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES tutor_session(id),
  role        TEXT NOT NULL,               -- user, assistant
  content     TEXT NOT NULL,
  at          INTEGER NOT NULL
);
CREATE INDEX idx_tutor_turn_session ON tutor_turn(session_id, id);

-- Every corrected mistake, for later practice (e.g. turned into cloze cards by another feature).
CREATE TABLE mistakes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lang        TEXT NOT NULL,
  original    TEXT NOT NULL,
  corrected   TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL,               -- tutor, writing, voice
  day         TEXT NOT NULL,               -- local date, e.g. 2026-10-01
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_mistakes_lang_day ON mistakes(lang, day);
