// WebSocket 處理器 - 處理即時音訊流和語音辨識
// 整合 Deepgram (語音辨識) + Gemini (翻譯) + Supabase (資料庫)

import { WebSocket } from 'ws';
import { createClient, DeepgramClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { SupabaseDatabase } from '../db/supabase.js';
import { GeminiService } from '../api/gemini.js';
import { randomUUID } from 'crypto';

interface RecordingSession {
  meetingId: string;
  deepgram: DeepgramClient;
  deepgramWs: any;
  gemini: GeminiService;
  startTime: number;
  segmentCount: number;
  pendingTranslations: Map<string, { translation: string; segment: any }>; // segmentId -> 翻譯結果
}

const sessions = new Map<WebSocket, RecordingSession>();

export function handleWebSocketConnection(ws: WebSocket, db: SupabaseDatabase): void {
  const gemini = new GeminiService();

  ws.on('message', async (data: Buffer) => {
    try {
      // 處理文字訊息（JSON 指令）
      if (data[0] === 123) { // '{' 的 ASCII 碼
        const message = JSON.parse(data.toString());
        await handleTextMessage(ws, message, db, gemini);
        return;
      }

      // 處理音訊資料
      const session = sessions.get(ws);
      if (session?.deepgramWs) {
        session.deepgramWs.send(data);
      }
    } catch (error) {
      console.error('[WebSocket] Error handling message:', error);
      ws.send(JSON.stringify({ type: 'error', error: 'Failed to process message' }));
    }
  });

  ws.on('close', () => {
    const session = sessions.get(ws);
    if (session) {
      // 清理 Deepgram 連線
      if (session.deepgramWs) {
        session.deepgramWs.finish();
      }
      sessions.delete(ws);
      console.log(`[WebSocket] Connection closed. Session ended for meeting ${session.meetingId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Connection error:', error);
  });
}

async function handleTextMessage(
  ws: WebSocket,
  message: any,
  db: SupabaseDatabase,
  gemini: GeminiService
): Promise<void> {
  switch (message.type) {
    case 'start_recording':
      await startRecording(ws, message.meetingId, db, gemini);
      break;

    case 'stop_recording':
      await stopRecording(ws, db);
      break;

    default:
      console.log('[WebSocket] Unknown message type:', message.type);
  }
}

async function startRecording(
  ws: WebSocket,
  meetingId: string,
  db: SupabaseDatabase,
  gemini: GeminiService
): Promise<void> {
  console.log(`[Recording] Starting recording for meeting ${meetingId}`);

  // 產生唯一的會議 ID（如果未提供）
  const actualMeetingId = meetingId || randomUUID();

  // 建立 Deepgram 連線
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');
  const deepgramWs = deepgram.listen.live({
    model: 'nova-2',
    language: 'zh-CN', // 主要語言為中文
    punctuate: true,
    smart_format: true,
    interim_results: true,
    profanity_filter: false,
    filler_words: true,
    encoding: 'linear16',
    sample_rate: 16000,
  });

  // 建立會議資料庫記錄
  const audioPath = `/recordings/${actualMeetingId}.wav`;
  await db.createMeeting({
    id: actualMeetingId,
    title: '會議記錄',
    audioPath,
  });

  // 追蹤待處理的翻譯 - segmentId -> { translation, originalSegment }
  const pendingTranslations = new Map<string, { translation: string; segment: any }>();

  // 處理 Deepgram 結果
  deepgramWs.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    const isFinal = data.is_final;
    const segmentId = randomUUID();

    // 翻譯成英文（使用 Gemini）
    let translatedText = '';
    if (isFinal) {
      // 先用佔位符
      translatedText = '[翻譯中...]';

      // 非同步翻譯，不阻塞
      gemini.translateText(transcript, 'zh')
        .then(async (result) => {
          // 更新資料庫中的翻譯
          try {
            // 更新資料庫中的翻譯
            await db.updateSegmentTranslation(segmentId, result);

            // 發送更新後的翻譯到客戶端
            ws.send(JSON.stringify({
              type: 'transcript_update',
              segmentId,
              translation: result,
            }));
          } catch (error) {
            console.error('[DB] Failed to update translation:', error);
          }
        })
        .catch(error => {
          console.error('[Gemini] Translation error:', error);
          // 翻譯失敗時保持原中文
        });
    }

    const segment = {
      id: segmentId,
      startTime: data.start || 0,
      endTime: data.duration || 0,
      text: {
        zh: transcript,
        en: translatedText,
      },
      confidence: data.channel?.alternatives?.[0]?.confidence || 0,
    };

    // 發送逐字稿到客戶端
    ws.send(JSON.stringify({
      type: 'transcript',
      segment,
    }));

    // 儲存到資料庫（僅最終結果）
    if (isFinal) {
      await db.addSegment({
        id: segmentId,
        meetingId: actualMeetingId,
        startTime: segment.startTime,
        endTime: segment.endTime,
        textZh: segment.text.zh,
        textEn: segment.text.en, // 之後會被更新
        confidence: segment.confidence,
      });

      // 更新會話片段計數
      const session = sessions.get(ws);
      if (session) {
        session.segmentCount++;

        // 檢查是否需要更新翻譯
        const checkTranslation = setInterval(async () => {
          const translation = pendingTranslations.get(segmentId);
          if (translation) {
            clearInterval(checkTranslation);
            // 發送更新後的翻譯到客戶端
            ws.send(JSON.stringify({
              type: 'transcript',
              segment: {
                ...segment,
                text: { zh: segment.text.zh, en: translation },
              },
            }));
          }
        }, 500);

        // 5 秒後停止檢查
        setTimeout(() => clearInterval(checkTranslation), 5000);
      }
    }
  });

  deepgramWs.on(LiveTranscriptionEvents.Error, (error: any) => {
    console.error('[Deepgram] Error:', error);
    ws.send(JSON.stringify({ type: 'error', error: 'Speech recognition error' }));
  });

  // 儲存會話
  sessions.set(ws, {
    meetingId: actualMeetingId,
    deepgram,
    deepgramWs,
    gemini,
    startTime: Date.now(),
    segmentCount: 0,
    pendingTranslations,
  });

  console.log(`[Recording] Session started for meeting ${actualMeetingId}`);
}

async function stopRecording(ws: WebSocket, db: SupabaseDatabase): Promise<void> {
  const session = sessions.get(ws);
  if (!session) {
    console.log('[Recording] No active session to stop');
    return;
  }

  console.log(`[Recording] Stopping recording for meeting ${session.meetingId}`);

  // 關閉 Deepgram 連線
  if (session.deepgramWs) {
    session.deepgramWs.finish();
  }

  // 計算錄音時長
  const duration = Math.floor((Date.now() - session.startTime) / 1000);
  await db.updateMeeting(session.meetingId, { duration });

  // 取得逐字稿內容
  const segments = await db.getSegments(session.meetingId);
  const fullTranscript = segments.map((s: any) => s.text_zh).join(' ');

  // 生成會議摘要（使用 Gemini）
  let summary = '';
  let actionItems: string[] = [];

  if (segments.length > 0) {
    try {
      const result = await session.gemini.generateSummary(fullTranscript);
      summary = result.summary;
      actionItems = result.actionItems;

      await db.updateMeeting(session.meetingId, {
        summary,
        action_items: actionItems,
      });
    } catch (error) {
      console.error('[Gemini] Failed to generate summary:', error);
    }
  }

  // 發送完成訊息
  ws.send(JSON.stringify({
    type: 'meeting_complete',
    meetingId: session.meetingId,
    summary,
    actionItems,
  }));

  // 清理會話
  sessions.delete(ws);

  console.log(`[Recording] Meeting ${session.meetingId} completed. Duration: ${duration}s, Segments: ${session.segmentCount}`);
}
