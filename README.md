# AI 會議翻譯系統

一套個人專用的網頁會議記錄系統，提供即時 AI 語音辨識、翻譯和會議筆記功能。

## 功能特色

- 🎙️ **即時語音辨識** - 支援中英文混合語音
- 🌐 **雙語翻譯** - 中文與英文並排顯示
- 📝 **AI 會議筆記** - 自動生成摘要和行動項目
- 🔊 **音訊錄製** - 完整會議錄音儲存
- 📤 **多格式匯出** - 支援 PDF、DOCX、TXT 格式
- ⚡ **快速啟動** - < 3 秒開始錄音

## 技術堆疊

- **前端**: Next.js 15 + Tailwind CSS + shadcn/ui
- **後端**: Node.js + TypeScript + WebSocket
- **資料庫**: Supabase (PostgreSQL)
- **AI API**:
  - Deepgram Nova-2 (語音辨識)
  - Google Gemini 2.0 Flash (翻譯與摘要 - 免費!)

## 部署方式

- **雲端部署**: [Railway](https://railway.com) ⭐ 推薦
- **資料庫**: Supabase
- **翻譯**: Google Gemini (免費)

## 快速開始

### Railway 一鍵部署 (推薦)

1. 推送程式碼到 GitHub
2. 在 Railway 從 GitHub 部署
3. 設定環境變數：
   - `DEEPGRAM_API_KEY`
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

詳細步驟請參考 [部署指南](./docs/deployment.md)。

### 本地開發

```bash
# 1. 複製專案
git clone <your-repo-url>
cd ai-meeting-translator

# 2. 安裝依賴
cd frontend && npm install
cd ../backend && npm install

# 3. 設定環境變數
cd backend
cp .env.example .env
# 編輯 .env 填入 API 金鑰

# 4. 啟動服務
npm run dev  # 後端
# (新終端) cd frontend && npm run dev  # 前端
```

## API 金鑰取得

### Deepgram (語音辨識)

前往 [deepgram.com](https://deepgram.com) 註冊
- 每月 $200 免費額度
- Nova-2: $0.009/分鐘

### Google Gemini (翻譯 - 免費!)

前往 [ai.google.dev](https://ai.google.dev) 取得 API 金鑰
- **gemini-2.0-flash-exp**: 免費使用，極快速度
- 每天免費 15 次/分鐘請求

### Supabase (資料庫 - 免費!)

前往 [supabase.com](https://supabase.com) 建立專案
- 免費層：500MB 資料庫儲存
- 東南亞區域低延遲

## 專案結構

```
ai-meeting-translator/
├── docs/              # 專案文檔
├── frontend/          # Next.js 前端
├── backend/           # Node.js 後端
├── railway.json       # Railway 配置
└── README.md
```

## 成本估算 (每月)

| 項目 | 成本 |
|------|------|
| Railway 主機 | $5-20 |
| Deepgram (20小時) | ~$11 |
| Gemini 翻譯 | $0 (免費!) |
| Supabase 資料庫 | $0 (免費!) |
| **總計** | **約 $16-31/月** |

## 文檔

- [需求文件](./docs/requirements.md)
- [架構設計](./docs/architecture.md)
- [API 整合說明](./docs/api-integration.md)
- [Railway 部署指南](./docs/deployment.md)

## 授權

個人專用，不提供公開授權。
