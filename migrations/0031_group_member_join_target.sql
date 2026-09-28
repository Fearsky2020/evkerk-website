-- 小组组员申请必须明确选择目标小组；审批范围以目标小组为准。
ALTER TABLE member_registration_applications ADD COLUMN requested_group_id TEXT REFERENCES church_groups(id);

CREATE INDEX IF NOT EXISTS idx_member_applications_requested_group
  ON member_registration_applications(requested_group_id, status, created_at);
