CREATE TABLE IF NOT EXISTS team_services (
  id TEXT PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_nl TEXT NOT NULL DEFAULT '',
  description_zh TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '•',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active','planned','hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_service_permissions (
  user_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  granted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, service_id),
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES team_services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_service_permissions_service
  ON team_service_permissions(service_id, user_id);

INSERT OR IGNORE INTO team_services(id,title_zh,title_nl,description_zh,href,icon,status,sort_order) VALUES
('sunday_school','主日学','Zondagsschool','课表、课程、备课、到场记录与教学记录。','/team/sunday-school/','📖','active',10),
('media','活动与照片','Activiteiten & foto’s','上传和管理教会活动照片。','/admin/','📷','active',20),
('content','网站内容与讲道','Website & preken','管理讲道、公告、特别活动和网站内容。','/admin/','✍️','active',30),
('admin','负责人管理','Beheer','管理同工账号、服事权限和全部网站管理。','/admin/','⚙️','active',40),
('catering','餐饮','Catering','餐食预备、采购、分工和当日安排。','','🍲','planned',100),
('events','活动','Activiteiten','教会活动的筹备、人员与执行。','','📅','planned',110),
('cleaning','清洁','Schoonmaak','场地清洁、轮值和用品安排。','','🧹','planned',120),
('flowers','献花','Bloemen','鲜花、布置与节期安排。','','💐','planned',130),
('choir','诗班','Koor','诗班排练、曲目和服事安排。','','🎶','planned',140),
('band','乐队','Band','乐队排练、乐手和曲目安排。','','🎸','planned',150),
('worship_ppt','敬拜PPT','Aanbidding PPT','歌词、经文与主日投影安排。','','🖥️','planned',160),
('audio','音响','Geluid','音控、录音和设备服事安排。','','🎚️','planned',170),
('welcome','接待','Ontvangst','接待、引导和新朋友关怀。','','🤝','planned',180),
('photography','摄影','Fotografie','活动摄影、素材整理和上传。','','📸','planned',190),
('finance','财务','Financiën','奉献与财务相关服事。','','🧾','planned',200),
('visitation','探访','Bezoekwerk','探访、关怀和跟进安排。','','❤️','planned',210);

-- Preserve current access when introducing service-level permissions.
INSERT OR IGNORE INTO team_service_permissions(user_id,service_id)
  SELECT id,'sunday_school' FROM admin_users WHERE role IN ('owner','editor');
INSERT OR IGNORE INTO team_service_permissions(user_id,service_id)
  SELECT id,'media' FROM admin_users WHERE role IN ('owner','editor','uploader');
INSERT OR IGNORE INTO team_service_permissions(user_id,service_id)
  SELECT id,'content' FROM admin_users WHERE role IN ('owner','editor');
INSERT OR IGNORE INTO team_service_permissions(user_id,service_id)
  SELECT id,'admin' FROM admin_users WHERE role='owner';
