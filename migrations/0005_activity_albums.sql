ALTER TABLE activity_gallery ADD COLUMN album_id TEXT;

UPDATE activity_gallery
   SET album_id = id
 WHERE album_id IS NULL OR album_id = '';

CREATE INDEX IF NOT EXISTS idx_activity_gallery_album
  ON activity_gallery(album_id, status, created_at DESC);
