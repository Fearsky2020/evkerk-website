CREATE TABLE IF NOT EXISTS welcome_case_photos (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  deleted_by TEXT,
  FOREIGN KEY (case_id) REFERENCES welcome_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES admin_users(id),
  FOREIGN KEY (deleted_by) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_welcome_case_photos_case
  ON welcome_case_photos(case_id, status, created_at);
