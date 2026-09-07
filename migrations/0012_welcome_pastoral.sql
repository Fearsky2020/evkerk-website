CREATE TABLE IF NOT EXISTS church_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cluster_name TEXT NOT NULL DEFAULT '',
  leader_name TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  meeting_day TEXT NOT NULL DEFAULT '',
  meeting_time TEXT NOT NULL DEFAULT '',
  dinner TEXT NOT NULL DEFAULT 'unknown' CHECK (dinner IN ('always','often','sometimes','no','unknown')),
  age_profile TEXT NOT NULL DEFAULT '',
  occupation_profile TEXT NOT NULL DEFAULT '',
  family_profile TEXT NOT NULL DEFAULT '',
  children_profile TEXT NOT NULL DEFAULT '',
  language_profile TEXT NOT NULL DEFAULT '',
  background_profile TEXT NOT NULL DEFAULT '',
  capacity_note TEXT NOT NULL DEFAULT '',
  accepting_newcomers INTEGER NOT NULL DEFAULT 1 CHECK (accepting_newcomers IN (0,1)),
  notes TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS welcome_cases (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '新朋友',
  contact_note TEXT NOT NULL DEFAULT '',
  postcode TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  age_band TEXT NOT NULL DEFAULT '',
  family_status TEXT NOT NULL DEFAULT '',
  children_note TEXT NOT NULL DEFAULT '',
  occupation_stage TEXT NOT NULL DEFAULT '',
  preferred_days TEXT NOT NULL DEFAULT '',
  language_note TEXT NOT NULL DEFAULT '',
  background_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','recommended','assigned','contacted','visited','following','stable','reassign','paused','closed')),
  assigned_group_id TEXT,
  primary_carer_user_id TEXT,
  next_followup_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (assigned_group_id) REFERENCES church_groups(id),
  FOREIGN KEY (primary_carer_user_id) REFERENCES admin_users(id),
  FOREIGN KEY (created_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS welcome_assignments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  group_id TEXT,
  carer_user_id TEXT,
  reason TEXT NOT NULL DEFAULT '',
  assigned_by TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  FOREIGN KEY (case_id) REFERENCES welcome_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES church_groups(id),
  FOREIGN KEY (carer_user_id) REFERENCES admin_users(id),
  FOREIGN KEY (assigned_by) REFERENCES admin_users(id)
);

CREATE TABLE IF NOT EXISTS welcome_followups (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  actor_user_id TEXT,
  outcome TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  next_followup_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES welcome_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_church_groups_postcode ON church_groups(postcode);
CREATE INDEX IF NOT EXISTS idx_welcome_cases_status ON welcome_cases(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_welcome_cases_carer ON welcome_cases(primary_carer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_welcome_assignments_case ON welcome_assignments(case_id, active, created_at);
CREATE INDEX IF NOT EXISTS idx_welcome_followups_case ON welcome_followups(case_id, created_at);

UPDATE team_services
SET title_zh='新人接待与牧养', title_nl='Ontvangst & pastorale zorg',
    description_zh='新人登记、邮编分组推荐、牧养负责人、跟进记录与结果。',
    href='/team/welcome/', icon='🤝', status='active', sort_order=25,
    updated_at=datetime('now')
WHERE id='welcome';

INSERT OR IGNORE INTO church_groups
(id,name,cluster_name,leader_name,postcode,latitude,longitude,meeting_day,meeting_time,dinner,age_profile,occupation_profile,family_profile,children_profile,language_profile,background_profile,capacity_note,accepting_newcomers,notes,is_demo)
VALUES
('demo-denhaag','测试小组 · 海牙中心','测试大组 A','测试组长 A','2511BT',52.07736854,4.31645627,'周二','19:30','often','25–40 岁较多','学生、IT、服务业','单身与年轻夫妻混合','少量有孩子家庭','中文为主','来荷时间长短都有','可接 2–3 位新人',1,'测试数据，真实资料到位后替换。',1),
('demo-rijswijk','测试小组 · Rijswijk','测试大组 A','测试组长 B','2281AT',52.05402522,4.34246803,'周五','19:00','always','30–50 岁较多','教育、贸易、技术','夫妻与家庭较多','有孩子家庭较多','中文为主','家庭型小组','目前可正常接收新人',1,'测试数据，真实资料到位后替换。',1),
('demo-delft','测试小组 · Delft','测试大组 B','测试组长 C','2611CN',52.00908472,4.36163406,'周三','19:30','sometimes','20–35 岁较多','学生、科研、工程','单身与年轻夫妻较多','孩子较少','中英双语较方便','留学生与年轻职场较多','可接 3–4 位新人',1,'测试数据，真实资料到位后替换。',1),
('demo-zoetermeer','测试小组 · Zoetermeer','测试大组 B','测试组长 D','2711EC',52.06108874,4.49301494,'周六','18:30','always','35–55 岁较多','商贸、护理、教育','家庭为主','有孩子家庭较多','中文为主','在荷生活较稳定','目前可接 1–2 个家庭',1,'测试数据，真实资料到位后替换。',1),
('demo-voorburg','测试小组 · Voorburg','测试大组 C','测试组长 E','2271AZ',52.06686732,4.36435845,'周一','20:00','no','30–45 岁较多','办公室、技术、自由职业','夫妻与单身混合','部分成员有孩子','中文为主','职场成员较多','可接少量新人',1,'测试数据，真实资料到位后替换。',1);
