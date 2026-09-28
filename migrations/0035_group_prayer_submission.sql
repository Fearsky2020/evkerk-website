-- 小组代祷提交：支持匿名、仅组长可见、幂等提交与处理记录。
ALTER TABLE group_prayer_items ADD COLUMN client_request_id TEXT NOT NULL DEFAULT '';
ALTER TABLE group_prayer_items ADD COLUMN handler_note TEXT NOT NULL DEFAULT '';
ALTER TABLE group_prayer_items ADD COLUMN handled_by_user_id TEXT;
ALTER TABLE group_prayer_items ADD COLUMN answered_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_prayer_member_request
  ON group_prayer_items(member_id,client_request_id)
  WHERE client_request_id<>'';

CREATE INDEX IF NOT EXISTS idx_group_prayer_visibility_status
  ON group_prayer_items(group_id,visibility,status,created_at);
