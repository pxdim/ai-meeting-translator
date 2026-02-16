// Deepgram API 整合 - 語音辨識

import { createClient, DeepgramClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class DeepgramService {
  private client: DeepgramClient;

  constructor() {
    this.client = createClient(process.env.DEEPGRAM_API_KEY || '');
  }

  /**
   * 建立即時語音辨識連線
   */
  createLiveConnection(options: {
    language?: string;
    punctuate?: boolean;
    smartFormat?: boolean;
    interimResults?: boolean;
  } = {}) {
    const {
      language = 'zh-CN',
      punctuate = true,
      smartFormat = true,
      interimResults = true,
    } = options;

    return this.client.listen.live({
      model: 'nova-2',
      language,
      punctuate,
      smartFormat: smartFormat,
      interimResults: interimResults,
      profanity_filter: false,
      filler_words: true,
      encoding: 'linear16',
      sample_rate: 16000,
    });
  }

  /**
   * 預先錄製的音訊檔案轉文字
   */
  async transcribeFile(audioBuffer: Buffer, options: {
    language?: string;
    punctuate?: boolean;
  } = {}) {
    const { language = 'zh', punctuate = true } = options;

    try {
      const result = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
        model: 'nova-2',
        language,
        punctuate,
        smartFormat: true,
      });

      return result;
    } catch (error) {
      console.error('[Deepgram] File transcription error:', error);
      throw error;
    }
  }
}

// 單例模式
let deepgramService: DeepgramService | null = null;

export function getDeepgramService(): DeepgramService {
  if (!deepgramService) {
    deepgramService = new DeepgramService();
  }
  return deepgramService;
}
