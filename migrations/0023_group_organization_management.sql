-- 四级小组组织、成员、范围权限、通知、申请和审计基础。
CREATE TABLE IF NOT EXISTS church_clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO church_clusters(id,name,sort_order) VALUES
('cluster-1','第一大组',10),('cluster-2','第二大组',20),
('cluster-3','第三大组',30),('cluster-4','第四大组',40);

ALTER TABLE church_groups ADD COLUMN cluster_id TEXT REFERENCES church_clusters(id);
ALTER TABLE church_groups ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE church_groups ADD COLUMN meeting_address TEXT NOT NULL DEFAULT '';
ALTER TABLE church_groups ADD COLUMN navigation_address TEXT NOT NULL DEFAULT '';
ALTER TABLE church_groups ADD COLUMN contact_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE church_groups ADD COLUMN reception_status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE church_groups ADD COLUMN weekly_status TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE church_groups ADD COLUMN temporary_change TEXT NOT NULL DEFAULT '';
ALTER TABLE church_groups ADD COLUMN announcement TEXT NOT NULL DEFAULT '';

UPDATE church_groups SET cluster_id=CASE cluster_name
 WHEN '第一大组' THEN 'cluster-1' WHEN '第二大组' THEN 'cluster-2'
 WHEN '第三大组' THEN 'cluster-3' WHEN '第四大组' THEN 'cluster-4' ELSE NULL END
WHERE is_demo=0;

CREATE TABLE IF NOT EXISTS organization_role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('pastor','cluster_leader','group_leader')),
  cluster_id TEXT,
  group_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  appointed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  FOREIGN KEY(user_id) REFERENCES admin_users(id),
  FOREIGN KEY(cluster_id) REFERENCES church_clusters(id),
  FOREIGN KEY(group_id) REFERENCES church_groups(id),
  FOREIGN KEY(appointed_by) REFERENCES admin_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_role_active_scope
 ON organization_role_assignments(user_id,role,ifnull(cluster_id,''),ifnull(group_id,'')) WHERE active=1;

CREATE TABLE IF NOT EXISTS church_members (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL DEFAULT '',
  cluster_id TEXT,
  group_id TEXT,
  admin_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','transferred','left','inactive')),
  member_role TEXT NOT NULL DEFAULT 'member' CHECK(member_role IN ('member','assistant')),
  family_note TEXT NOT NULL DEFAULT '',
  language_note TEXT NOT NULL DEFAULT '',
  private_note TEXT NOT NULL DEFAULT '',
  joined_at TEXT,
  left_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(cluster_id) REFERENCES church_clusters(id),
  FOREIGN KEY(group_id) REFERENCES church_groups(id),
  FOREIGN KEY(admin_user_id) REFERENCES admin_users(id),
  FOREIGN KEY(created_by) REFERENCES admin_users(id)
);
CREATE INDEX IF NOT EXISTS idx_members_scope ON church_members(cluster_id,group_id,status);

CREATE TABLE IF NOT EXISTS member_app_tokens (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  last_used_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  FOREIGN KEY(member_id) REFERENCES church_members(id),
  FOREIGN KEY(created_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS group_assistants (
  group_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  appointed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(group_id,member_id),
  FOREIGN KEY(group_id) REFERENCES church_groups(id),
  FOREIGN KEY(member_id) REFERENCES church_members(id),
  FOREIGN KEY(appointed_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS group_notifications (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('church','cluster','group')),
  cluster_id TEXT,
  group_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('draft','active','expired','inactive')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(cluster_id) REFERENCES church_clusters(id),
  FOREIGN KEY(group_id) REFERENCES church_groups(id),
  FOREIGN KEY(created_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS organization_change_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL CHECK(request_type IN ('member_transfer','member_leave','member_update','group_transfer')),
  member_id TEXT,
  group_id TEXT,
  target_cluster_id TEXT,
  target_group_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  requested_by TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(member_id) REFERENCES church_members(id),
  FOREIGN KEY(group_id) REFERENCES church_groups(id),
  FOREIGN KEY(target_cluster_id) REFERENCES church_clusters(id),
  FOREIGN KEY(target_group_id) REFERENCES church_groups(id),
  FOREIGN KEY(requested_by) REFERENCES admin_users(id),
  FOREIGN KEY(reviewed_by) REFERENCES admin_users(id)
);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON organization_change_requests(status,created_at);

CREATE TABLE IF NOT EXISTS organization_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_member_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(actor_user_id) REFERENCES admin_users(id),
  FOREIGN KEY(actor_member_id) REFERENCES church_members(id)
);
CREATE INDEX IF NOT EXISTS idx_org_audit_entity ON organization_audit_log(entity_type,entity_id,created_at);
CREATE INDEX IF NOT EXISTS idx_org_audit_actor ON organization_audit_log(actor_user_id,created_at);

ALTER TABLE welcome_cases ADD COLUMN source TEXT NOT NULL DEFAULT 'website';
ALTER TABLE welcome_cases ADD COLUMN submitted_by_member_id TEXT REFERENCES church_members(id);
ALTER TABLE welcome_cases ADD COLUMN assigned_cluster_id TEXT REFERENCES church_clusters(id);
ALTER TABLE welcome_cases ADD COLUMN welcome_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE welcome_followups ADD COLUMN contact_date TEXT;
ALTER TABLE welcome_followups ADD COLUMN contact_method TEXT NOT NULL DEFAULT '';
ALTER TABLE welcome_followups ADD COLUMN welcome_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE welcome_followups ADD COLUMN attended INTEGER;
ALTER TABLE welcome_followups ADD COLUMN assigned_cluster_id TEXT REFERENCES church_clusters(id);
ALTER TABLE welcome_followups ADD COLUMN assigned_group_id TEXT REFERENCES church_groups(id);

UPDATE welcome_cases SET assigned_cluster_id=(SELECT cluster_id FROM church_groups g WHERE g.id=welcome_cases.assigned_group_id)
WHERE assigned_group_id IS NOT NULL AND assigned_cluster_id IS NULL;

INSERT INTO team_services(id,title_zh,title_nl,description_zh,href,icon,status,sort_order)
VALUES('organization','小组与组织管理','Groepen en organisatie','四级组织架构、小组、成员、新人分配、跟进和通知。','/team/groups/','🌿','active',24)
ON CONFLICT(id) DO UPDATE SET title_zh=excluded.title_zh,title_nl=excluded.title_nl,
 description_zh=excluded.description_zh,href=excluded.href,icon=excluded.icon,status='active',sort_order=excluded.sort_order,updated_at=datetime('now');

INSERT OR IGNORE INTO team_service_permissions(user_id,service_id)
 SELECT id,'organization' FROM admin_users WHERE role='owner';
