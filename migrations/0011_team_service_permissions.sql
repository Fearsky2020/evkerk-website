CREATE TABLE IF NOT EXISTS team_service_permissions (
  user_id TEXT NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('sunday_school','media','content','admin')),
  granted_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, service),
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_service_permissions_service
  ON team_service_permissions(service, user_id);

-- Preserve current access when introducing service-level permissions.
INSERT OR IGNORE INTO team_service_permissions(user_id,service)
  SELECT id,'sunday_school' FROM admin_users WHERE role IN ('owner','editor');
INSERT OR IGNORE INTO team_service_permissions(user_id,service)
  SELECT id,'media' FROM admin_users WHERE role IN ('owner','editor','uploader');
INSERT OR IGNORE INTO team_service_permissions(user_id,service)
  SELECT id,'content' FROM admin_users WHERE role IN ('owner','editor');
INSERT OR IGNORE INTO team_service_permissions(user_id,service)
  SELECT id,'admin' FROM admin_users WHERE role='owner';
