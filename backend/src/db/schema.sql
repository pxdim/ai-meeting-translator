-- 資料庫結構定義

-- 會議表
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '會議記錄',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  duration INTEGER NOT NULL DEFAULT 0,
  audio_path TEXT NOT NULL,
  summary TEXT,
  action_items TEXT  -- JSON array string
);

-- 逐字稿片段表
CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text_zh TEXT NOT NULL,
  text_en TEXT NOT NULL,
  confidence REAL NOT NULL,
  speaker TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_meeting_segments ON transcript_segments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_created_at ON meetings(created_at DESC);

-- 觀圖：會議摘要
CREATE VIEW IF NOT EXISTS meeting_summary AS
SELECT
  m.id,
  m.title,
  m.created_at,
  m.duration,
  m.summary,
  COUNT(ts.id) as segment_count
FROM meetings m
LEFT JOIN transcript_segments ts ON m.id = ts.meeting_id
GROUP BY m.id;
