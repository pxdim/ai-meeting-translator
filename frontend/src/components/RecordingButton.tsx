'use client';

// 錄音按鈕組件 - 大型中央按鈕，快速啟動錄音

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAudioRecordingSupported } from '@/lib/audio-recorder';

interface RecordingButtonProps {
  isRecording: boolean;
  isPaused?: boolean;
  isConnecting?: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause?: () => void;
  disabled?: boolean;
  className?: string;
}

export function RecordingButton({
  isRecording,
  isPaused = false,
  isConnecting = false,
  onStart,
  onStop,
  onPause,
  disabled = false,
  className = '',
}: RecordingButtonProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setIsSupported(isAudioRecordingSupported());
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      setPulse(true);
    } else {
      setPulse(false);
    }
  }, [isRecording, isPaused]);

  if (!isSupported) {
    return (
      <Button
        disabled
        size="lg"
        className={cn(
          'h-32 w-32 rounded-full text-destructive bg-destructive/10',
          className
        )}
      >
        <MicOff className="h-12 w-12" />
      </Button>
    );
  }

  if (isConnecting) {
    return (
      <Button
        disabled
        size="lg"
        className={cn(
          'h-32 w-32 rounded-full',
          className
        )}
      >
        <Loader2 className="h-12 w-12 animate-spin" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-4">
        {onPause && (
          <Button
            onClick={onPause}
            size="lg"
            variant="outline"
            className="h-16 w-16 rounded-full"
          >
            {isPaused ? '繼續' : '暫停'}
          </Button>
        )}
        <Button
          onClick={onStop}
          size="lg"
          variant="destructive"
          className={cn(
            'h-32 w-32 rounded-full text-lg font-semibold',
            pulse && 'animate-pulse',
            className
          )}
        >
          <MicOff className="h-12 w-12 mr-2" />
          停止
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={onStart}
      disabled={disabled}
      size="lg"
      className={cn(
        'h-32 w-32 rounded-full text-lg font-semibold bg-primary hover:bg-primary/90 transition-all hover:scale-105',
        className
      )}
    >
      <Mic className="h-12 w-12 mr-2" />
      開始錄音
    </Button>
  );
}

// 狀態指示器
interface StatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'connecting';
  className?: string;
}

export function StatusIndicator({ status, className = '' }: StatusIndicatorProps) {
  const statusConfig = {
    connected: { color: 'bg-green-500', text: '已連線', pulse: true },
    disconnected: { color: 'bg-gray-400', text: '未連線', pulse: false },
    connecting: { color: 'bg-yellow-500', text: '連線中...', pulse: true },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'h-2 w-2 rounded-full',
        config.color,
        config.pulse && 'animate-pulse'
      )} />
      <span className="text-sm text-muted-foreground">{config.text}</span>
    </div>
  );
}

// 錄音計時器
interface RecordingTimerProps {
  seconds: number;
  className?: string;
}

export function RecordingTimer({ seconds, className = '' }: RecordingTimerProps) {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('text-2xl font-mono tabular-nums', className)}>
      {formatTime(seconds)}
    </div>
  );
}
