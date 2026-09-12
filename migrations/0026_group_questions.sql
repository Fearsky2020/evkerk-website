CREATE TABLE IF NOT EXISTS group_questions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL CHECK(chapter >= 1),
  verse_start INTEGER NOT NULL CHECK(verse_start >= 1),
  verse_end INTEGER,
  reference TEXT NOT NULL,
  scripture_text TEXT NOT NULL,
  question TEXT NOT NULL,
  client_request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','discussed','closed')),
  source TEXT NOT NULL DEFAULT 'website' CHECK(source IN ('ios','android','website')),
  discussed_at TEXT,
  closed_at TEXT,
  handled_by_member_id TEXT,
  handled_by_user_id TEXT,
  handler_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(member_id) REFERENCES church_members(id),
  FOREIGN KEY(cluster_id) REFERENCES church_clusters(id),
  FOREIGN KEY(group_id) REFERENCES church_groups(id),
  FOREIGN KEY(handled_by_member_id) REFERENCES church_members(id),
  FOREIGN KEY(handled_by_user_id) REFERENCES admin_users(id),
  UNIQUE(member_id, client_request_id)
);
CREATE INDEX IF NOT EXISTS idx_group_questions_group_status_created ON group_questions(group_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_questions_member_created ON group_questions(member_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_questions_cluster_created ON group_questions(cluster_id,created_at DESC);
