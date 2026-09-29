-- 小组生活首页：本周经文与讨论主题。
ALTER TABLE church_groups ADD COLUMN weekly_scripture_reference TEXT NOT NULL DEFAULT '';
ALTER TABLE church_groups ADD COLUMN weekly_scripture_text TEXT NOT NULL DEFAULT '';
ALTER TABLE church_groups ADD COLUMN discussion_theme TEXT NOT NULL DEFAULT '';
