# API 整合說明

## Deepgram API (語音辨識)

### 註冊與設定

1. 前往 [https://deepgram.com](https://deepgram.com) 註冊帳號
2. 建立 API 金鑰
3. 將金鑰加入後端 `.env` 檔案：

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### 整合方式

使用 WebSocket 進行即時語音辨識：

```typescript
// backend/src/api/deepgram.ts
import WebSocket from 'ws';
import { createClient } from '@deepgram/sdk';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function startTranscription(meetingId: string) {
  const deepgramWs = deepgram.listen.live({
    model: 'nova-2',
    language: 'zh-CN', // 主要語言
    smart_format: true,
    interim_results: true,
    punctuate: true,
    profanity_filter: false,
  });

  deepgramWs.on('transcript', (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    // 處理逐字稿
  });

  return deepgramWs;
}
```

### 費用

- **Nova-2**: $0.009/分鐘
- **免費額度**: 每月 $200 免費額度

### 最佳化

- 設定正確的語言模型以提高準確度
- 使用 `smart_format` 自動格式化數字、日期等
- 啟用 `interim_results` 即時顯示臨時結果

## OpenAI API (翻譯與摘要)

### 註冊與設定

1. 前往 [https://platform.openai.com](https://platform.openai.com) 註冊
2. 建立 API 金鑰
3. 將金鑰加入後端 `.env` 檔案：

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 翻譯功能

```typescript
// backend/src/api/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateText(text: string, fromLang: 'zh' | 'en') {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: fromLang === 'zh'
          ? '你是專業的中翻英翻譯員。請翻譯以下中文文本，保持原意和語氣。'
          : '你是專業的英翻中翻譯員。請翻譯以下英文文本，保持原意和語氣。',
      },
      { role: 'user', content: text },
    ],
    stream: true, // 啟用串流
  });

  return response; // Stream
}
```

### 會議摘要

```typescript
export async function generateMeetingSummary(transcript: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `請分析以下會議逐字稿，提供：
1. 會議摘要（3-5 句話）
2. 主要討論主題
3. 達成的決策
4. 行動項目（包含負責人和期限，如果提及）`,
      },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 費用

- **GPT-4o**: $5/百萬 input tokens, $15/百萬 output tokens
- **預估**: 每小時會議約 $0.15-$0.20

### 最佳化

- 使用 `stream: true` 提供即時回饋
- 緩存翻譯結果避免重複請求
- 批次處理逐字稿片段以減少 API 呼叫

## 安全考量

### API 金鑰保護

```typescript
// ❌ 錯誤 - 不要在前端暴露金鑰
const deepgram = createClient('dg-api-key-12345');

// ✅ 正確 - 金鑰在後端
// 前端透過 WebSocket 連接後端
// 後端使用環境變數中的金鑰
```

### 權限控制

```typescript
// 限制 API 金鑰權限
// Deepgram: 只允許特定功能
// OpenAI: 設定使用量限制
```

### 重試機制

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // 指數退避
    }
  }
  throw new Error('Max retries exceeded');
}
```

## 測試

### 本地測試

```bash
# 測試 Deepgram 連線
cd backend
npm run test:deepgram

# 測試 OpenAI 連線
npm run test:openai
```

### 監控

- 記錄 API 使用量
- 追蹤回應時間
- 監控錯誤率

## 成本優化建議

1. **Deepgram**
   - 使用免費額度內的模型
   - 考慮批次處理短會議

2. **OpenAI**
   - 批次翻譯而非逐句翻譯
   - 使用 GPT-4o-mini 處理簡單任務
   - 緩存常見翻譯

3. **一般**
   - 實作使用量限制
   - 設定預算警報
