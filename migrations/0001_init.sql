CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  title_zh TEXT,
  title_nl TEXT,
  description_zh TEXT,
  description_nl TEXT,
  location TEXT,
  start_at TEXT,
  end_at TEXT,
  all_day INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_at, end_at, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_external ON events(source, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sermons (
  id TEXT PRIMARY KEY,
  sermon_date TEXT,
  title_zh TEXT,
  title_nl TEXT,
  speaker TEXT,
  scripture TEXT,
  summary_zh TEXT,
  summary_nl TEXT,
  youtube_url TEXT,
  audio_url TEXT,
  transcript_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(sermon_date, status);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title_zh TEXT,
  title_nl TEXT,
  body_zh TEXT,
  body_nl TEXT,
  starts_at TEXT,
  ends_at TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_announcements_window ON announcements(status, starts_at, ends_at, priority);
