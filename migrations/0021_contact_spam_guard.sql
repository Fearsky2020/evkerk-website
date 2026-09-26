CREATE TABLE IF NOT EXISTS contact_rate_events (
  id TEXT PRIMARY KEY,
  client_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_rate_events_key_time
  ON contact_rate_events(client_key, created_at);
