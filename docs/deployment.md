# Railway 部署指南

本專案使用 **Railway** 進行雲端部署，整合以下服務：
- **Deepgram** - 語音辨識
- **Google Gemini** - 翻譯與會議摘要
- **Supabase** - 資料庫儲存

## Railway 快速部署

### 1. 推送程式碼到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. 在 Railway 部署後端

1. 前往 [railway.com](https://railway.com)
2. 點擊 **New Project** → **Deploy from GitHub repo**
3. 選擇您的專案
4. 選擇 `backend` 資料夾作為根目錄
5. Railway 會自動檢測 Node.js 專案並建置

### 3. 設定環境變數

在 Railway 專案設定中加入以下環境變數：

```env
NODE_ENV=production
PORT=3001

# Deepgram API
DEEPGRAM_API_KEY=your_deepgram_api_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-exp

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

CORS_ORIGIN=*
```

### 4. 部署前端

1. 在 Railway 專案中新增一個 **Service**
2. 選擇 **Deploy from GitHub repo**
3. 選擇 `frontend` 資料夾
4. 設定環境變數：
   ```env
   NEXT_PUBLIC_WS_URL=your-backend-railway-url
   ```

### 5. 設定自訂域名（可選）

1. 在 Railway 專案設定中
2. 點擊 **Settings** → **Domains**
3. 新增您的域名
4. 按照指示設定 DNS

## Supabase 設定

### 1. 建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com)
2. 點擊 **New Project**
3. 設定專案名稱和資料庫密碼
4. 選擇離您最近的區域（建議：Southeast Asia for Taiwan）

### 2. 建立資料表

在 Supabase SQL Editor 中執行：

```sql
-- 會議表
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '會議記錄',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER DEFAULT 0,
  audio_path TEXT NOT NULL,
  summary TEXT,
  action_items TEXT
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_meeting_segments ON transcript_segments(meeting_id);
CREATE INDEX idx_meeting_created_at ON meetings(created_at DESC);

-- 啟用 RLS (可選，個人使用可不啟用)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
```

### 3. 取得連線資訊

在 Supabase 專案設定中：
- **Project URL** → 設定為 `SUPABASE_URL`
- **service_role** Key → 設定為 `SUPABASE_SERVICE_KEY`

## Google Gemini API

### 1. 取得 API 金鑰

1. 前往 [ai.google.dev](https://ai.google.dev)
2. 點擊 **Get API Key**
3. 建立 API 金鑰

### 2. 推薦模型

| 模型 | 速度 | 成本 | 推薦用途 |
|------|------|------|----------|
| `gemini-2.0-flash-exp` | ⚡ 最快 | 免費 | 即時翻譯（推薦） |
| `gemini-1.5-flash` | ⚡ 快 | 低 | 批次翻譯 |
| `gemini-1.5-pro` | 🐢 中等 | 中 | 會議摘要 |

免費額度：
- gemini-2.0-flash-exp: 每天免費 15 次/分鐘請求
- gemini-1.5-flash: 每天 1000 次請求

## Deepgram API

### 1. 取得 API 金鑰

1. 前往 [deepgram.com](https://deepgram.com)
2. 註冊並建立 API 金鑰
3. 每月 $200 免費額度

### 2. 費用

- Nova-2: $0.009/分鐘
- 60 分鐘會議: $0.54
- 每月 20 小時: 約 $10.80

## 成本估算

### Railway 主機

- **免費層**: $5/月 (限額)
- **付費**: 從 $20/月起

### API 成本

| 服務 | 每小時 | 20小時/月 |
|------|--------|------------|
| Deepgram | $0.54 | $10.80 |
| Gemini | $0 (免費) | $0 |
| Supabase 免費層 | - | $0 |

### 總成本

- **主機**: $5-20/月
- **API**: 約 $11/月
- **總計**: **約 $16-31/月**

## 監控與日誌

在 Railway 中：
- **Metrics**: 查看 CPU、記憶體使用
- **Logs**: 查看應用程式日誌
- **Deployments**: 查看部署歷史

## 故障排除

### 資料庫連線失敗

1. 檢查 `SUPABASE_URL` 和 `SUPABASE_SERVICE_KEY`
2. 確認 Supabase 專案未暫停
3. 驗證資料表已正確建立

### Gemini API 失敗

1. 確認 `GEMINI_API_KEY` 正確
2. 檢查 API 配額是否用盡
3. 考慮切換到其他模型

### Railway 建置失敗

1. 檢查 `package.json` 腳本
2. 查看建置日誌
3. 確認 TypeScript 編譯成功
