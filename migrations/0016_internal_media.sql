CREATE TABLE IF NOT EXISTS internal_media (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'hymn',
  title_zh TEXT NOT NULL,
  title_nl TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'video/mp4',
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_internal_media_status_sort
  ON internal_media(status, category, sort_order, title_zh);

INSERT OR IGNORE INTO internal_media
  (id,category,title_zh,title_nl,r2_key,mime_type,filename,status,sort_order)
VALUES
  ('001-he-er-wei-yi','hymn','合而为一','Eén in Christus','internal-hymns/reference/001-he-er-wei-yi.mp4','video/mp4','001-he-er-wei-yi.mp4','active',10);
UPDATE team_services
   SET title_zh='媒体与照片',
       title_nl='Media & foto’s',
       description_zh='内部媒体、诗歌视频与教会活动照片。',
       href='/team/media/',
       icon='🎬',
       status='active',
       updated_at=datetime('now')
 WHERE id='media';
