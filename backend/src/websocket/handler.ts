// WebSocket 處理器 - 處理即時音訊流和語音辨識

import { WebSocket } from 'ws';
import { createClient, DeepgramClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { DatabaseClient } from '../db/client.js';
import { OpenAIService } from '../api/openai.js';
import { randomUUID } from 'crypto';

interface RecordingSession {
  meetingId: string;
  deepgram: DeepgramClient;
  deepgramWs: any;
  startTime: number;
  segmentCount: number;
}

const sessions = new Map<WebSocket, RecordingSession>();

export function handleWebSocketConnection(ws: WebSocket, db: DatabaseClient): void {
  const openai = new OpenAIService();

  ws.on('message', async (data: Buffer) => {
    try {
      // 處理文字訊息（JSON 指令）
      if (data[0] === 123) { // '{' 的 ASCII 碼
        const message = JSON.parse(data.toString());
        await handleTextMessage(ws, message, db, openai);
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
  db: DatabaseClient,
  openai: OpenAIService
): Promise<void> {
  switch (message.type) {
    case 'start_recording':
      await startRecording(ws, message.meetingId, db, openai);
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
  db: DatabaseClient,
  openai: OpenAIService
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
  });

  // 建立會議資料庫記錄
  const audioPath = `./src/storage/recordings/${actualMeetingId}.wav`;
  db.createMeeting({
    id: actualMeetingId,
    title: '會議記錄',
    audioPath,
  });

  // 處理 Deepgram 結果
  deepgramWs.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;

    const isFinal = data.is_final;
    const segmentId = randomUUID();

    // 翻譯成英文
    let translatedText = '';
    if (isFinal) {
      translatedText = await openai.translateText(transcript, 'zh');
    }

    const segment = {
      id: segmentId,
      startTime: data.start || 0,
      endTime: data.duration || 0,
      text: {
        zh: transcript,
        en: translatedText || '[翻譯中...]',
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
      db.addSegment({
        id: segmentId,
        meetingId: actualMeetingId,
        startTime: segment.startTime,
        endTime: segment.endTime,
        textZh: segment.text.zh,
        textEn: segment.text.en,
        confidence: segment.confidence,
      });

      // 更新會話片段計數
      const session = sessions.get(ws);
      if (session) {
        session.segmentCount++;
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
    startTime: Date.now(),
    segmentCount: 0,
  });

  console.log(`[Recording] Session started for meeting ${actualMeetingId}`);
}

async function stopRecording(ws: WebSocket, db: DatabaseClient): Promise<void> {
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
  db.updateMeeting(session.meetingId, { duration });

  // 取得逐字稿內容
  const segments = db.getSegments(session.meetingId);
  const fullTranscript = segments.map((s: any) => s.text_zh).join(' ');

  // 生成會議摘要（如果逐字稿不為空）
  let summary = '';
  let actionItems: string[] = [];

  if (segments.length > 0) {
    try {
      const result = await generateMeetingSummary(fullTranscript);
      summary = result.summary;
      actionItems = result.actionItems;

      db.updateMeeting(session.meetingId, {
        summary,
        actionItems: JSON.stringify(actionItems),
      });
    } catch (error) {
      console.error('[OpenAI] Failed to generate summary:', error);
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

async function generateMeetingSummary(transcript: string): Promise<{
  summary: string;
  actionItems: string[];
}> {
  // 這裡可以整合 OpenAI API 生成摘要
  // 簡化版本：
  return {
    summary: '會議摘要生成功能待實作',
    actionItems: [],
  };
}
