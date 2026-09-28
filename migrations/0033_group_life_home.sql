-- 小组生活首页：欢迎语与代祷事项。
ALTER TABLE church_groups ADD COLUMN welcome_message TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS group_prayer_items (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  member_id TEXT,
  content TEXT NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'group' CHECK (visibility IN ('group','leaders')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','answered','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES church_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES church_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_group_prayer_items_group_status
  ON group_prayer_items(group_id,status,created_at);
