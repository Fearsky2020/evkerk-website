ALTER TABLE internal_media ADD COLUMN media_date TEXT;
ALTER TABLE internal_media ADD COLUMN size_bytes INTEGER;

CREATE INDEX IF NOT EXISTS idx_internal_media_category_date
  ON internal_media(category, media_date, sort_order);
