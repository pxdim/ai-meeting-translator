'use client';

// 錄音頁面 - 即時語音辨識與雙語翻譯顯示

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecordingButton, RecordingTimer, StatusIndicator } from '@/components/RecordingButton';
import { TranscriptDisplay } from '@/components/TranscriptDisplay';
import { WebSocketClient } from '@/lib/websocket';
import { AudioRecorder } from '@/lib/audio-recorder';
import type { TranscriptSegment, WSMessage, WSTranscriptMessage, WSTranscriptUpdateMessage } from '@/types/meeting';
import { ArrowLeft, Pause, Play } from 'lucide-react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export default function RecordingPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [meetingId, setMeetingId] = useState('');

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化 WebSocket 和 AudioRecorder
  useEffect(() => {
    const ws = new WebSocketClient({
      url: WS_URL,
      onMessage: handleWSMessage,
      onStatusChange: setConnectionStatus,
      onError: (error) => console.error('WebSocket error:', error),
    });
    wsClientRef.current = ws;

    const recorder = new AudioRecorder({
      onDataAvailable: handleAudioData,
      onError: (error) => console.error('Audio recorder error:', error),
    });
    audioRecorderRef.current = recorder;

    return () => {
      ws.disconnect();
      recorder.stop();
    };
  }, []);

  // 處理 WebSocket 訊息
  const handleWSMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'status':
        setConnectionStatus(message.status);
        break;
      case 'transcript':
        setTranscripts(prev => {
          const segment = (message as WSTranscriptMessage).segment;
          // 更新或添加片段
          const existingIndex = prev.findIndex(s => s.id === segment.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = segment;
            return updated;
          }
          return [...prev, segment];
        });
        break;
      case 'transcript_update':
        // 更新翻譯結果
        setTranscripts(prev => {
          const updateMsg = message as WSTranscriptUpdateMessage;
          const existingIndex = prev.findIndex(s => s.id === updateMsg.segmentId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              text: {
                ...updated[existingIndex].text,
                en: updateMsg.translation,
              },
            };
            return updated;
          }
          return prev;
        });
        break;
      case 'meeting_complete':
        // 導航到會議詳情頁面
        router.push(`/meeting/${message.meetingId}`);
        break;
      case 'error':
        console.error('Server error:', message.error);
        break;
    }
  }, [router]);

  // 處理音訊資料
  const handleAudioData = useCallback((data: Blob) => {
    if (wsClientRef.current?.isConnected()) {
      data.arrayBuffer().then(buffer => {
        wsClientRef.current?.sendAudioData(buffer);
      });
    }
  }, []);

  // 計時器
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // 開始錄音
  const handleStart = async () => {
    setIsConnecting(true);

    // 連接 WebSocket
    wsClientRef.current?.connect();

    // 等待連接建立
    setTimeout(async () => {
      const newMeetingId = `meeting-${Date.now()}`;
      setMeetingId(newMeetingId);

      // 開始錄音
      try {
        await audioRecorderRef.current?.start();
        wsClientRef.current?.startRecording(newMeetingId);
        setIsRecording(true);
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsConnecting(false);
      }
    }, 1000);
  };

  // 停止錄音
  const handleStop = () => {
    audioRecorderRef.current?.stop();
    wsClientRef.current?.stopRecording();
    setIsRecording(false);
    setDuration(0);
  };

  // 暫停/繼續
  const handlePause = () => {
    if (isPaused) {
      audioRecorderRef.current?.resume();
      setIsPaused(false);
    } else {
      audioRecorderRef.current?.pause();
      setIsPaused(true);
    }
  };

  // 返回首頁
  const handleBack = () => {
    if (isRecording) {
      if (confirm('錄音正在進行中，確定要離開嗎？')) {
        handleStop();
        router.push('/');
      }
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航 */}
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-4 flex items-center gap-4">
            <h1 className="text-lg font-semibold">會議錄音中</h1>
            <RecordingTimer seconds={duration} />
            <StatusIndicator status={connectionStatus} />
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container max-w-6xl py-6 px-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左側：控制面板 */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">錄音控制</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <RecordingButton
                    isRecording={isRecording}
                    isPaused={isPaused}
                    isConnecting={isConnecting}
                    onStart={handleStart}
                    onStop={handleStop}
                    onPause={handlePause}
                  />
                </div>

                {isRecording && (
                  <div className="text-center space-y-2 text-sm text-muted-foreground">
                    <p>已錄製 {transcripts.length} 個片段</p>
                    <p>已持續 {Math.floor(duration / 60)} 分 {duration % 60} 秒</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 會議資訊 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">會議資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">會議 ID：</span>
                  <span className="font-mono text-xs">{meetingId || '未建立'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">狀態：</span>
                  <span>{isRecording ? (isPaused ? '已暫停' : '錄音中') : '待機'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">連線：</span>
                  <span>{connectionStatus === 'connected' ? '已連線' : '未連線'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：即時逐字稿 */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">即時逐字稿</h2>
              {isRecording && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="animate-pulse">●</span>
                  <span>即時更新中</span>
                </div>
              )}
            </div>
            <TranscriptDisplay
              segments={transcripts}
              isRecording={isRecording && !isPaused}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
