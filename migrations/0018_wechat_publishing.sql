CREATE TABLE IF NOT EXISTS wechat_users (
  openid TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wechat_pending_actions (
  id TEXT PRIMARY KEY,
  confirmation_code TEXT NOT NULL UNIQUE,
  actor_openid TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  source_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_pending_message
  ON wechat_pending_actions(source_message_id) WHERE source_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wechat_audit_log (
  id TEXT PRIMARY KEY,
  actor_openid TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload_json TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS devotionals (
  id TEXT PRIMARY KEY,
  devotional_date TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  scripture TEXT,
  body_zh TEXT NOT NULL,
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  author_openid TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_devotionals_date
  ON devotionals(status, devotional_date, published_at);
