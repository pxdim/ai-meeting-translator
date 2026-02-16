// WebSocket 客戶端 - 與後端進行即時通訊

import type { WSMessage, WSTranscriptMessage } from '@/types/meeting';

export interface WebSocketClientOptions {
  url: string;
  onMessage: (message: WSMessage) => void;
  onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
  onError?: (error: Error) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onMessage: (message: WSMessage) => void;
  private onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
  private onError?: (error: Error) => void;
  private isConnecting = false;

  constructor(options: WebSocketClientOptions) {
    this.url = options.url;
    this.onMessage = options.onMessage;
    this.onStatusChange = options.onStatusChange;
    this.onError = options.onError;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.onStatusChange?.('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onStatusChange?.('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.onMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.onStatusChange?.('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        const error = new Error('WebSocket connection error');
        this.onError?.(error);
      };
    } catch (error) {
      this.isConnecting = false;
      this.onError?.(error as Error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  sendAudioData(audioData: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  startRecording(meetingId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'start_recording',
        meetingId,
      }));
    }
  }

  stopRecording(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'stop_recording',
      }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts; // 防止自動重連
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 建立實例的工廠函數
export function createWebSocketClient(
  url: string,
  onMessage: (message: WSMessage) => void,
  onStatusChange?: (status: 'connected' | 'disconnected' | 'connecting') => void
): WebSocketClient {
  return new WebSocketClient({
    url,
    onMessage,
    onStatusChange,
    onError: (error) => console.error('WebSocket error:', error),
  });
}
