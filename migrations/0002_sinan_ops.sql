CREATE TABLE IF NOT EXISTS sinan_jobs (
  id TEXT PRIMARY KEY,
  intent_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  status TEXT NOT NULL,
  actor TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'qq',
  source_message_id TEXT,
  request_text TEXT,
  payload_json TEXT NOT NULL,
  result_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sinan_jobs_status_created ON sinan_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sinan_jobs_actor_created ON sinan_jobs(actor, created_at DESC);

CREATE TABLE IF NOT EXISTS sinan_approvals (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT,
  FOREIGN KEY(job_id) REFERENCES sinan_jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_sinan_approvals_actor_status ON sinan_approvals(actor, status, created_at DESC);

CREATE TABLE IF NOT EXISTS sinan_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'qq',
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  reversible INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'complete',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  undone_at TEXT,
  UNIQUE(operation_id)
);
CREATE INDEX IF NOT EXISTS idx_sinan_audit_actor_created ON sinan_audit_log(actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sinan_audit_entity ON sinan_audit_log(entity_type, entity_id, created_at DESC);
