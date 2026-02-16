# 架構設計

## 系統架構

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端（瀏覽器）                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  React App   │  │  即時逐字稿   │  │     音訊錄製          │   │
│  │  + Tailwind  │  │  顯示區       │  │   (MediaRecorder)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ WebSocket + REST API
┌─────────────────────────────┴───────────────────────────────────┐
│                      後端（Node.js）                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   API 代理   │  │  WebSocket   │  │    檔案儲存          │   │
│  │  (API 金鑰)  │  │   處理器      │  │  (錄音 + 資料庫)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                     外部 API                                     │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   Deepgram   │  │   OpenAI     │                             │
│  │  語音轉文字   │  │   GPT-4o     │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## 前端架構

### 頁面結構

```
app/
├── page.tsx              # 首頁 - 錄音按鈕 + 最近會議
├── recording/
│   └── page.tsx          # 錄音頁面 - 雙語逐字稿
├── meeting/
│   └── [id]/
│       └── page.tsx      # 會議詳情 - 完整逐字稿 + 筆記
├── history/
│   └── page.tsx          # 會議歷史列表
└── layout.tsx            # 根佈局
```

### 組件結構

```
components/
├── RecordingButton.tsx   # 錄音按鈕
├── TranscriptDisplay.tsx # 雙語逐字稿顯示
├── AudioPlayer.tsx       # 音訊播放器
├── MeetingCard.tsx       # 會議卡片
├── StatusIndicator.tsx   # 狀態指示器
└── ExportButton.tsx      # 匯出按鈕
```

### 狀態管理

使用 React 狀態 + WebSocket 即時更新：

```typescript
// 錄音狀態
interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  transcript: TranscriptSegment[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}
```

## 後端架構

### 模組結構

```
src/
├── server.ts             # 主伺服器入口
├── websocket/
│   └── handler.ts        # WebSocket 處理器
├── api/
│   ├── deepgram.ts       # Deepgram API 整合
│   ├── openai.ts         # OpenAI API 整合
│   └── meetings.ts       # 會議 CRUD 操作
├── db/
│   ├── schema.sql        # 資料庫結構
│   └── client.ts         # 資料庫客戶端
└── storage/
    ├── audio.ts          # 音訊儲存管理
    └── recordings/       # 錄音檔案目錄
```

### WebSocket 通訊協定

**客戶端 → 伺服器**

```typescript
// 開始錄音
{ type: 'start_recording', meetingId: string }

// 音訊資料
{ type: 'audio_data', data: ArrayBuffer }

// 停止錄音
{ type: 'stop_recording' }
```

**伺服器 → 客戶端**

```typescript
// 逐字稿更新
{
  type: 'transcript',
  segment: {
    id: string,
    startTime: number,
    endTime: number,
    text: { zh: string, en: string },
    confidence: number
  }
}

// 狀態更新
{ type: 'status', status: 'connected' | 'processing' | 'error' }

// 會議完成
{ type: 'meeting_complete', meetingId: string, summary: string }
```

## 資料模型

### 資料庫結構

```sql
-- 會議表
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  audio_path TEXT NOT NULL,
  summary TEXT,
  action_items TEXT  -- JSON array
);

-- 逐字稿片段表
CREATE TABLE transcript_segments (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  text_zh TEXT NOT NULL,
  text_en TEXT NOT NULL,
  confidence REAL NOT NULL,
  speaker TEXT,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE INDEX idx_meeting_segments ON transcript_segments(meeting_id);
```

## API 整合

### Deepgram (語音辨識)

- **端點**: wss://api.deepgram.com/v1/listen
- **功能**: 即時語音轉文字
- **延遲**: < 300ms
- **語言**: 中文 (zh-CN) + 英文 (en-US)

### OpenAI GPT-4o (翻譯與摘要)

- **端點**: https://api.openai.com/v1/chat/completions
- **功能**: 翻譯、會議摘要、行動項目擷取
- **模式**: Streaming API

## 部署架構

### 開發環境

```
localhost:3000 (前端)
localhost:3001 (後端)
```

### 生產環境

```
Nginx (反向代理)
  ├── /api/* → 後端
  └── /* → 前端靜態檔案
```

### Docker 部署

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
  backend:
    build: ./backend
    ports: ["3001:3001"]
    volumes: ["./data:/app/storage"]
```
