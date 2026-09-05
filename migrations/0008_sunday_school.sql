CREATE TABLE IF NOT EXISTS sunday_school_teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sunday_school_lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  scripture TEXT,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sunday_school_schedule (
  id TEXT PRIMARY KEY,
  lesson_date TEXT NOT NULL,
  teacher_id TEXT,
  lesson_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES sunday_school_teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (lesson_id) REFERENCES sunday_school_lessons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sunday_school_notes (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(schedule_id, teacher_id),
  FOREIGN KEY (schedule_id) REFERENCES sunday_school_schedule(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES sunday_school_teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sunday_school_students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sunday_school_attendance (
  schedule_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','leave')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (schedule_id, student_id),
  FOREIGN KEY (schedule_id) REFERENCES sunday_school_schedule(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES sunday_school_students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sunday_school_records (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL UNIQUE,
  teacher_id TEXT NOT NULL,
  progress TEXT NOT NULL DEFAULT '',
  response TEXT NOT NULL DEFAULT '',
  follow_up TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (schedule_id) REFERENCES sunday_school_schedule(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES sunday_school_teachers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ss_schedule_date ON sunday_school_schedule(lesson_date);
CREATE INDEX IF NOT EXISTS idx_ss_records_updated ON sunday_school_records(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ss_students_status ON sunday_school_students(status, sort_order, name);
