-- ========================================
-- AI 會議翻譯系統 - Supabase 資料表結構
-- ========================================

-- 會議表
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '會議記錄',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER DEFAULT 0,
  audio_path TEXT NOT NULL,
  summary TEXT,
  action_items TEXT
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_meeting_segments ON transcript_segments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_created_at ON meetings(created_at DESC);

-- 啟用 RLS (可選，個人使用可不啟用)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- 允許所有操作（個人使用）
DROP POLICY IF EXISTS "Enable all for users" ON meetings;
CREATE POLICY "Enable all for users" ON meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for users" ON transcript_segments;
CREATE POLICY "Enable all for users" ON transcript_segments FOR ALL USING (true) WITH CHECK (true);
