-- 会友自助申请、人工审核、邀请和可撤销 App 会话。
CREATE TABLE IF NOT EXISTS member_registration_applications (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  requested_group_number INTEGER,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  member_id TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  rejection_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(member_id) REFERENCES church_members(id),
  FOREIGN KEY(reviewed_by) REFERENCES admin_users(id)
);
CREATE INDEX IF NOT EXISTS idx_member_applications_status ON member_registration_applications(status,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_applications_pending_email
 ON member_registration_applications(lower(email)) WHERE status='pending' AND email<>'';
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_applications_pending_phone
 ON member_registration_applications(phone) WHERE status='pending' AND phone<>'';

CREATE TABLE IF NOT EXISTS member_app_credentials (
  member_id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  login_code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  must_change_code INTEGER NOT NULL DEFAULT 1 CHECK(must_change_code IN (0,1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(member_id) REFERENCES church_members(id),
  FOREIGN KEY(created_by) REFERENCES admin_users(id)
);

ALTER TABLE member_app_tokens ADD COLUMN scopes TEXT NOT NULL DEFAULT 'my-group:read';
ALTER TABLE member_app_tokens ADD COLUMN device_id TEXT NOT NULL DEFAULT '';
ALTER TABLE member_app_tokens ADD COLUMN access_expires_at TEXT;
ALTER TABLE member_app_tokens ADD COLUMN refresh_token_hash TEXT;
ALTER TABLE member_app_tokens ADD COLUMN refresh_expires_at TEXT;
ALTER TABLE member_app_tokens ADD COLUMN revoked_reason TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_app_refresh_hash ON member_app_tokens(refresh_token_hash) WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_member_app_token_member_status ON member_app_tokens(member_id,status,access_expires_at);
