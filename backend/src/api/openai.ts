// OpenAI API 整合 - 翻譯與會議摘要

import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 翻譯文字
   * @param text 要翻譯的文字
   * @param fromLang 來源語言 ('zh' | 'en')
   */
  async translateText(text: string, fromLang: 'zh' | 'en'): Promise<string> {
    try {
      const systemPrompt = fromLang === 'zh'
        ? '你是專業的中翻英翻譯員。請翻譯以下中文文本，保持原意和語氣。只輸出翻譯結果，不要加任何解釋。'
        : '你是專業的英翻中翻譯員。請翻譯以下英文文本，保持原意和語氣。只輸出翻譯結果，不要加任何解釋。';

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      console.error('[OpenAI] Translation error:', error);
      return ''; // 翻譯失敗時返回空字串
    }
  }

  /**
   * 生成會議摘要
   * @param transcript 會議逐字稿
   */
  async generateSummary(transcript: string): Promise<{
    summary: string;
    actionItems: string[];
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `請分析以下會議逐字稿，提供：
1. 會議摘要（3-5 句話）
2. 行動項目列表（如果提及）

請以 JSON 格式回應：
{
  "summary": "會議摘要...",
  "actionItems": ["行動項目 1", "行動項目 2"]
}`,
          },
          {
            role: 'user',
            content: transcript.substring(0, 16000), // 限制長度避免超過 token 限制
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error('[OpenAI] Summary generation error:', error);
      return {
        summary: '',
        actionItems: [],
      };
    }
  }

  /**
   * 串流翻譯（即時回饋）
   */
  async *translateStream(text: string, fromLang: 'zh' | 'en'): AsyncGenerator<string> {
    const systemPrompt = fromLang === 'zh'
      ? '你是專業的中翻英翻譯員。請翻譯以下中文文本。'
      : '你是專業的英翻中翻譯員。請翻譯以下英文文本。';

    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('[OpenAI] Streaming translation error:', error);
    }
  }
}
