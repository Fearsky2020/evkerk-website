-- Complete confirmed postcodes for all remaining real church groups.
-- Coordinates are intentionally reset; the recommendation service hydrates them from PDOK.
UPDATE church_groups SET postcode='2594CC',latitude=NULL,longitude=NULL,updated_at=datetime('now') WHERE group_number=1 AND is_demo=0;
UPDATE church_groups SET postcode='3034JB',latitude=NULL,longitude=NULL,updated_at=datetime('now') WHERE group_number=9 AND is_demo=0;
UPDATE church_groups SET postcode='2264TR',latitude=NULL,longitude=NULL,updated_at=datetime('now') WHERE group_number=16 AND is_demo=0;
UPDATE church_groups SET postcode='3072MD',latitude=NULL,longitude=NULL,updated_at=datetime('now') WHERE group_number=31 AND is_demo=0;
UPDATE church_groups SET postcode='2286XJ',latitude=NULL,longitude=NULL,updated_at=datetime('now') WHERE group_number=32 AND is_demo=0;
UPDATE church_groups SET postcode='2288EA',latitude=NULL,longitude=NULL,updated_at=datetime('now') WHERE group_number=33 AND is_demo=0;
