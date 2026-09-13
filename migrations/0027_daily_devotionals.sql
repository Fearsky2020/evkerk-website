CREATE TABLE IF NOT EXISTS daily_devotionals (
  id TEXT PRIMARY KEY,
  devotional_date TEXT NOT NULL UNIQUE,
  reference TEXT NOT NULL,
  scripture_text TEXT NOT NULL,
  reflection_prompt TEXT NOT NULL,
  share_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_devotionals_one_date
  ON daily_devotionals(devotional_date);
CREATE INDEX IF NOT EXISTS idx_daily_devotionals_status_date
  ON daily_devotionals(status, devotional_date);

CREATE TABLE IF NOT EXISTS daily_devotional_audit_log (
  id TEXT PRIMARY KEY,
  devotional_id TEXT NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_daily_devotional_audit
  ON daily_devotional_audit_log(devotional_id, created_at DESC);

INSERT INTO team_services(id,title_zh,title_nl,description_zh,href,icon,status,sort_order)
VALUES('daily_devotional','每日经文','Dagoverdenking','统一管理网站、iOS 和 Android 使用的每日经文与默想问题。','/team/devotionals/','☀','active',35)
ON CONFLICT(id) DO UPDATE SET
  title_zh=excluded.title_zh,
  title_nl=excluded.title_nl,
  description_zh=excluded.description_zh,
  href=excluded.href,
  icon=excluded.icon,
  status=excluded.status,
  sort_order=excluded.sort_order,
  updated_at=datetime('now');
