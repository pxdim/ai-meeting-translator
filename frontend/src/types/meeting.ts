// 會議資料類型定義

export interface Meeting {
  id: string;
  title: string;
  createdAt: Date;
  duration: number; // 秒數
  audioPath: string;
  transcript: TranscriptSegment[];
  summary?: string;
  actionItems?: string[];
}

export interface TranscriptSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: {
    zh: string; // 中文
    en: string; // 英文翻譯
  };
  confidence: number;
  speaker?: string;
}

// WebSocket 訊息類型
export type WSMessage =
  | WSStatusMessage
  | WSTranscriptMessage
  | WSTranscriptUpdateMessage
  | WSMeetingCompleteMessage
  | WSErrorMessage;

export interface WSStatusMessage {
  type: 'status';
  status: 'connected' | 'disconnected' | 'connecting' | 'processing';
}

export interface WSTranscriptMessage {
  type: 'transcript';
  segment: TranscriptSegment;
}

export interface WSTranscriptUpdateMessage {
  type: 'transcript_update';
  segmentId: string;
  translation: string;
}

export interface WSMeetingCompleteMessage {
  type: 'meeting_complete';
  meetingId: string;
  summary: string;
  actionItems: string[];
}

export interface WSErrorMessage {
  type: 'error';
  error: string;
}

// 錄音狀態
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  transcript: TranscriptSegment[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}
