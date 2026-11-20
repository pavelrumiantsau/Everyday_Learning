-- Ukrainian grammar section (docs/UK-GRAMMAR-PLAN.md §4): part tests («Контрольная части»). New table only.
CREATE TABLE uk_part (
  part      INTEGER PRIMARY KEY, -- 1–13
  best      INTEGER NOT NULL,    -- best score, per cent
  passed_at INTEGER              -- epoch ms of the first pass (≥ 85 %); NULL = not passed yet
);
