// 音訊錄製工具 - 使用瀏覽器 MediaRecorder API

export interface AudioRecorderOptions {
  onDataAvailable: (data: Blob) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
  mimeType?: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onDataAvailable: (data: Blob) => void;
  private onStart?: () => void;
  private onStop?: () => void;
  private onError?: (error: Error) => void;
  private mimeType: string;
  private isRecording = false;

  constructor(options: AudioRecorderOptions) {
    this.onDataAvailable = options.onDataAvailable;
    this.onStart = options.onStart;
    this.onStop = options.onStop;
    this.onError = options.onError;
    this.mimeType = options.mimeType || this.getDefaultMimeType();
  }

  private getDefaultMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  async start(): Promise<void> {
    if (this.isRecording) {
      return;
    }

    try {
      // 請求麥克風權限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Deepgram 建議的採樣率
        },
      });

      // 建立MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
        audioBitsPerSecond: 128000,
      });

      // 設定事件處理器
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.onDataAvailable(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.onStart?.();
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.onStop?.();
      };

      this.mediaRecorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        this.onError?.(error);
      };

      // 開始錄音，每 100ms 發送一次資料
      this.mediaRecorder.start(100);

    } catch (error) {
      this.onError?.(error as Error);
      throw error;
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    // 停止所有音訊軌道
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  pause(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.resume();
    }
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getSupportedMimeTypes(): string[] {
    return [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
    ].filter((type) => MediaRecorder.isTypeSupported(type));
  }
}

// 檢查瀏覽器支援
export function isAudioRecordingSupported(): boolean {
  return !!(navigator.mediaDevices?.getUserMedia && MediaRecorder);
}

// 取得麥克風權限狀態
export async function getMicrophonePermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch {
    return 'prompt';
  }
}
