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
- **資料庫**: SQLite (better-sqlite3)
- **AI API**:
  - Deepgram Nova-2 (語音辨識)
  - OpenAI GPT-4o (翻譯與摘要)

## 快速開始

### 1. 複製專案

```bash
git clone <your-repo-url>
cd ai-meeting-translator
```

### 2. 安裝依賴

```bash
# 前端
cd frontend
npm install

# 後端
cd ../backend
npm install
```

### 3. 設定環境變數

```bash
cd backend
cp .env.example .env
```

編輯 `.env` 檔案，填入您的 API 金鑰：

```env
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. 啟動服務

```bash
# 後端 (終端 1)
cd backend
npm run dev

# 前端 (終端 2)
cd frontend
npm run dev
```

### 5. 開始使用

開啟瀏覽器訪問 http://localhost:3000

## 專案結構

```
ai-meeting-translator/
├── docs/              # 專案文檔
├── frontend/          # Next.js 前端
│   ├── src/
│   │   ├── app/       # 頁面路由
│   │   ├── components/# React 組件
│   │   ├── lib/       # 工具函式
│   │   └── types/     # TypeScript 類型
│   └── package.json
├── backend/           # Node.js 後端
│   ├── src/
│   │   ├── api/       # API 整合
│   │   ├── db/        # 資料庫
│   │   ├── websocket/ # WebSocket 處理
│   │   └── server.ts  # 主伺服器
│   └── package.json
└── docker-compose.yml # Docker 部署
```

## API 金鑰取得

### Deepgram

1. 前往 [https://deepgram.com](https://deepgram.com) 註冊
2. 建立新的 API 金鑰
3. 每月 $200 免費額度

### OpenAI

1. 前往 [https://platform.openai.com](https://platform.openai.com) 註冊
2. 建立 API 金鑰
3. 使用 GPT-4o 進行翻譯和摘要

## Docker 部署

```bash
docker-compose up -d
```

## 成本估算

- **Deepgram**: $0.009/分鐘
- **OpenAI**: 約 $0.15-0.20/小時
- **主機**: $5-10/月
- **總計 (20小時/月)**: 約 $20-25/月

## 文檔

- [需求文件](./docs/requirements.md)
- [架構設計](./docs/architecture.md)
- [API 整合說明](./docs/api-integration.md)
- [部署指南](./docs/deployment.md)

## 授權

個人專用，不提供公開授權。
