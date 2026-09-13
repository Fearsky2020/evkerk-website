-- 新人基础资料与照片上传完整性；不复用牧养生命周期 status。
ALTER TABLE welcome_cases ADD COLUMN submission_status TEXT NOT NULL DEFAULT 'complete'
  CHECK (submission_status IN ('submitted','photo_pending','complete','needs_attention'));
ALTER TABLE welcome_cases ADD COLUMN expected_photo_count INTEGER NOT NULL DEFAULT 0
  CHECK (expected_photo_count BETWEEN 0 AND 20);
CREATE INDEX IF NOT EXISTS idx_welcome_submission_status
  ON welcome_cases(submission_status, updated_at);
