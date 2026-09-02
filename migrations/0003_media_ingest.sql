CREATE TABLE IF NOT EXISTS media_ingest_jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'admin',
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  r2_key TEXT NOT NULL,
  sermon_date TEXT,
  speaker TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  worker_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  transcript_text TEXT,
  title_zh TEXT,
  title_nl TEXT,
  summary_zh TEXT,
  summary_nl TEXT,
  article_zh TEXT,
  article_nl TEXT,
  scripture TEXT,
  scripture_json TEXT,
  uncertain_notes TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  claimed_at TEXT,
  ready_at TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_ingest_status
  ON media_ingest_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_ingest_date
  ON media_ingest_jobs(sermon_date, created_at);

ALTER TABLE sermons ADD COLUMN article_zh TEXT;
ALTER TABLE sermons ADD COLUMN article_nl TEXT;
ALTER TABLE sermons ADD COLUMN media_job_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sermons_media_job ON sermons(media_job_id);
