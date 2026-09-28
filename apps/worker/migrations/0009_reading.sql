-- Reading mode: texts read, cached word lookups, words the learner added from texts, Thursday "text of the day".
CREATE TABLE reading_done (
  text_id TEXT PRIMARY KEY,
  done_at INTEGER NOT NULL,
  correct INTEGER,                 -- comprehension questions answered right
  total   INTEGER
);

CREATE TABLE lookup_cache (
  lang       TEXT NOT NULL,
  word       TEXT NOT NULL,        -- normalized (lower case, NFC)
  result     TEXT NOT NULL,        -- JSON: lemma, pos, meaning, gender?, forms?, gen?
  created_at INTEGER NOT NULL,
  PRIMARY KEY (lang, word)
);

CREATE TABLE learner_item (
  n          INTEGER PRIMARY KEY AUTOINCREMENT,  -- item id: u-<lang>-<n, 6 digits>
  lang       TEXT NOT NULL,
  lemma      TEXT NOT NULL,
  data       TEXT NOT NULL,        -- JSON: an Item-compatible object without id
  created_at INTEGER NOT NULL,
  UNIQUE (lang, lemma)
);

CREATE TABLE reading_day (
  day     TEXT PRIMARY KEY,
  text_id TEXT NOT NULL,
  sent_at INTEGER
);
