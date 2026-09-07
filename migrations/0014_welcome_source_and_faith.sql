ALTER TABLE welcome_cases ADD COLUMN reception_site TEXT NOT NULL DEFAULT '';
ALTER TABLE welcome_cases ADD COLUMN invited_by TEXT NOT NULL DEFAULT '';
ALTER TABLE welcome_cases ADD COLUMN faith_status TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_welcome_cases_reception_site
  ON welcome_cases(reception_site, created_at);
