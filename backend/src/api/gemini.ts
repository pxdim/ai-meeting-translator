// Google Gemini API 整合 - 翻譯與會議摘要

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * 推薦的 Gemini 模型：
 *
 * gemini-2.0-flash-exp
 *   - 最新實驗性模型
 *   - 極快回應速度 (< 1秒)
 *   - 免費使用
 *   - 適合即時翻譯
 *
 * gemini-1.5-flash
 *   - 快速回應
 *   - 較低成本
 *   - 適合大量翻譯
 *
 * gemini-1.5-pro
 *   - 最佳品質
 *   - 較慢速度
 *   - 較高成本
 *   - 適合會議摘要
 */

export type GeminiModel =
  | 'gemini-2.0-flash-exp'  // 最新實驗性，免費，最快
  | 'gemini-1.5-flash'      // 快速，低成本
  | 'gemini-1.5-pro';       // 最佳品質

export class GeminiService {
  private client: GoogleGenerativeAI;
  private model: GeminiModel;

  constructor(apiKey?: string, model: GeminiModel = 'gemini-2.0-flash-exp') {
    this.client = new GoogleGenerativeAI(
      apiKey || process.env.GEMINI_API_KEY || ''
    );
    this.model = model;
  }

  /**
   * 翻譯文字
   * @param text 要翻譯的文字
   * @param fromLang 來源語言 ('zh' | 'en')
   */
  async translateText(
    text: string,
    fromLang: 'zh' | 'en'
  ): Promise<string> {
    try {
      const systemPrompt = fromLang === 'zh'
        ? '你是專業的中翻英翻譯員。請翻譯以下中文文本，保持原意和語氣。只輸出翻譯結果，不要加任何解釋。'
        : '你是專業的英翻中翻譯員。請翻譯以下英文文本，保持原意和語氣。只輸出翻譯結果，不要加任何解釋。';

      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(text);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('[Gemini] Translation error:', error);
      return ''; // 翻譯失敗時返回空字串
    }
  }

  /**
   * 批次翻譯（多段文字）
   */
  async translateBatch(
    texts: string[],
    fromLang: 'zh' | 'en'
  ): Promise<string[]> {
    const prompt = texts
      .map((text, i) => `[${i + 1}] ${text}`)
      .join('\n\n');

    const systemPrompt = fromLang === 'zh'
      ? `你是專業的中翻英翻譯員。請翻譯以下中文文本（有多段，用 [1], [2] 標記）。請保持相同格式輸出翻譯結果。`
      : `你是專業的英翻中翻譯員。請翻譯以下英文文本（有多段，用 [1], [2] 標記）。請保持相同格式輸出翻譯結果。`;

    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translated = response.text().trim();

      // 解析批次結果
      const lines = translated.split('\n').filter(line => line.trim());
      return texts.map((_, i) => {
        const match = lines.find(line => line.match(/^\[\d+\]/));
        if (match) {
          return match.replace(/^\[\d+\]\s*/, '');
        }
        return '';
      });
    } catch (error) {
      console.error('[Gemini] Batch translation error:', error);
      return texts.map(() => '');
    }
  }

  /**
   * 串流翻譯（即時回饋）
   */
  async *translateStream(
    text: string,
    fromLang: 'zh' | 'en'
  ): AsyncGenerator<string> {
    const systemPrompt = fromLang === 'zh'
      ? '你是專業的中翻英翻譯員。請翻譯以下中文文本。'
      : '你是專業的英翻中翻譯員。請翻譯以下英文文本。';

    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContentStream(text);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          yield chunkText;
        }
      }
    } catch (error) {
      console.error('[Gemini] Streaming translation error:', error);
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
      // 使用 Pro 模型獲得更好的摘要品質
      const summaryModel = this.client.getGenerativeModel({
        model: 'gemini-1.5-pro',
      });

      const prompt = `請分析以下會議逐字稿，提供：
1. 會議摘要（3-5 句話）
2. 行動項目列表（如果提及）

請以 JSON 格式回應：
{
  "summary": "會議摘要...",
  "actionItems": ["行動項目 1", "行動項目 2"]
}

會議逐字稿：
${transcript.substring(0, 16000)}`;

      const result = await summaryModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // 解析 JSON 回應
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        summary: text,
        actionItems: [],
      };
    } catch (error) {
      console.error('[Gemini] Summary generation error:', error);
      return {
        summary: '',
        actionItems: [],
      };
    }
  }

  /**
   * 擷取行動項目
   */
  async extractActionItems(transcript: string): Promise<string[]> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
      });

      const prompt = `請從以下會議逐字稿中擷取所有行動項目。
以 JSON 陣列格式回應：["行動項目 1", "行動項目 2"]

會議逐字稿：
${transcript}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // 解析 JSON 陣列
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }

      return [];
    } catch (error) {
      console.error('[Gemini] Action items extraction error:', error);
      return [];
    }
  }
}

// 單例模式
let geminiService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiService) {
    const model = (process.env.GEMINI_MODEL as GeminiModel) || 'gemini-2.0-flash-exp';
    geminiService = new GeminiService(undefined, model);
  }
  return geminiService;
}

/**
 * Gemini 模型比較
 *
 * 模型              | 速度  | 品質  | 成本      | 推薦用途
 * -----------------|-------|-------|----------|------------------
 * gemini-2.0-flash  | ⚡最快| ★★★☆ | 免費     | 即時翻譯（推薦）
 * gemini-1.5-flash  | ⚡快  | ★★★★ | 低成本   | 批次翻譯
 * gemini-1.5-pro    | 🐢較慢| ★★★★★| 中等成本 | 會議摘要
 */
