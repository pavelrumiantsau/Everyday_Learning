-- User preferences (one JSON document) and paused days.
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL            -- JSON
);
ALTER TABLE activity_day ADD COLUMN paused INTEGER NOT NULL DEFAULT 0;
