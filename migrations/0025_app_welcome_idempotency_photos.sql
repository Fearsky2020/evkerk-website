-- App 新人提交幂等键与私有 R2 照片归属。
ALTER TABLE welcome_cases ADD COLUMN client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_welcome_app_client_request
 ON welcome_cases(submitted_by_member_id,client_request_id)
 WHERE submitted_by_member_id IS NOT NULL AND client_request_id IS NOT NULL;
ALTER TABLE welcome_case_photos ADD COLUMN uploaded_by_member_id TEXT REFERENCES church_members(id);
CREATE INDEX IF NOT EXISTS idx_welcome_photos_member ON welcome_case_photos(uploaded_by_member_id,created_at);
