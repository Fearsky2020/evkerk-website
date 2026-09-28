-- 可撤销的小组邀请二维码。只存 token hash，不持久化原始邀请 token。
CREATE TABLE IF NOT EXISTS group_join_invites (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  FOREIGN KEY (group_id) REFERENCES church_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_group_join_invites_group_status
  ON group_join_invites(group_id,status,created_at);
