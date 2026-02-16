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
- **後端**: Node.js + FastMCP + WebSocket
- **資料庫**: SQLite
- **AI API**: Deepgram (語音辨識) + OpenAI GPT-4o (翻譯與摘要)

## 快速開始

### 安裝依賴

```bash
# 前端
cd frontend
npm install

# 後端
cd ../backend
npm install
```

### 設定環境變數

```bash
cd backend
cp .env.example .env
# 編輯 .env 填入您的 API 金鑰
```

### 啟動服務

```bash
# 後端
cd backend
npm run dev

# 前端（新終端）
cd frontend
npm run dev
```

訪問 http://localhost:3000 開始使用。

## 文檔

- [需求文件](./requirements.md)
- [架構設計](./architecture.md)
- [API 整合說明](./api-integration.md)
- [部署指南](./deployment.md)

## 授權

個人專用，不提供公開授權。
