CREATE TABLE IF NOT EXISTS hero_slides (
  id TEXT PRIMARY KEY,
  title_zh TEXT,
  title_nl TEXT,
  subtitle_zh TEXT,
  subtitle_nl TEXT,
  image_key TEXT NOT NULL,
  image_mime TEXT NOT NULL,
  image_size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hero_slides_public
  ON hero_slides(status, sort_order DESC, created_at DESC);
