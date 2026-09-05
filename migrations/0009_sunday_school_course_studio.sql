ALTER TABLE sunday_school_lessons ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE sunday_school_lessons ADD COLUMN generation_id TEXT;
ALTER TABLE sunday_school_lessons ADD COLUMN approved_by TEXT;
ALTER TABLE sunday_school_lessons ADD COLUMN approved_at TEXT;

CREATE TABLE IF NOT EXISTS sunday_school_music (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL DEFAULT '',
  lyrics TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sunday_school_lesson_pages (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'teaching' CHECK (page_type IN ('cover','scripture','teaching','question','image','music','summary','prayer')),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  scripture TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  music_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lesson_id) REFERENCES sunday_school_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (music_id) REFERENCES sunday_school_music(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sunday_school_schedule_pages (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  source_page_id TEXT,
  page_type TEXT NOT NULL DEFAULT 'teaching' CHECK (page_type IN ('cover','scripture','teaching','question','image','music','summary','prayer')),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  scripture TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL DEFAULT '',
  music_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_id) REFERENCES sunday_school_schedule(id) ON DELETE CASCADE,
  FOREIGN KEY (music_id) REFERENCES sunday_school_music(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sunday_school_generation_requests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  scripture TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  focus TEXT NOT NULL DEFAULT '',
  style_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_executor' CHECK (status IN ('pending_executor','generating','ready_for_review','approved','rejected','failed')),
  executor TEXT NOT NULL DEFAULT 'sinan',
  requested_by TEXT,
  lesson_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  review_notes TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (lesson_id) REFERENCES sunday_school_lessons(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ss_lesson_pages_order ON sunday_school_lesson_pages(lesson_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_ss_schedule_pages_order ON sunday_school_schedule_pages(schedule_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_ss_generation_status ON sunday_school_generation_requests(status,created_at);
