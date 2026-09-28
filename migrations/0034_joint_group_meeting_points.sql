-- 联合小组：一个 group 实体，多聚会点，成员仍然只有一个 group_id。
ALTER TABLE church_groups
  ADD COLUMN group_kind TEXT NOT NULL DEFAULT 'regular'
  CHECK (group_kind IN ('regular','joint'));

CREATE TABLE IF NOT EXISTS group_meeting_points (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  leader_name TEXT NOT NULL DEFAULT '',
  meeting_day TEXT NOT NULL DEFAULT '',
  meeting_time TEXT NOT NULL DEFAULT '',
  meeting_address TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  navigation_address TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  week_slots TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES church_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_meeting_points_group
  ON group_meeting_points(group_id,status,sort_order);

CREATE TABLE IF NOT EXISTS group_meeting_overrides (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  meeting_point_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','cancelled','pending')),
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES church_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_point_id) REFERENCES group_meeting_points(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admin_users(id),
  UNIQUE (group_id,meeting_date)
);

CREATE INDEX IF NOT EXISTS idx_group_meeting_overrides_group_date
  ON group_meeting_overrides(group_id,meeting_date);
