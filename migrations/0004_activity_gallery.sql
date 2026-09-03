CREATE TABLE IF NOT EXISTS activity_gallery (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  title_nl TEXT,
  event_date TEXT,
  location TEXT,
  image_key TEXT NOT NULL,
  image_mime TEXT NOT NULL,
  image_size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_gallery_public
  ON activity_gallery(status, sort_order DESC, event_date DESC, created_at DESC);
