ALTER TABLE member_registration_applications ADD COLUMN postcode TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_member_applications_postcode
  ON member_registration_applications(postcode, status);
