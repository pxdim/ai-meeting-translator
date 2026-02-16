'use client';

// 雙語逐字稿顯示組件 - 中文與英文並排顯示

import React, { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '@/types/meeting';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2 } from 'lucide-react';

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  isRecording?: boolean;
  onSegmentClick?: (segment: TranscriptSegment) => void;
  className?: string;
}

export function TranscriptDisplay({
  segments,
  isRecording = false,
  onSegmentClick,
  className = '',
}: TranscriptDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 自動捲動到底部
  useEffect(() => {
    if (isRecording && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments, isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-500';
    if (confidence >= 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (segments.length === 0) {
    return (
      <Card className={`p-8 text-center text-muted-foreground ${className}`}>
        {isRecording ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
            </div>
            <p>正在聽取...</p>
          </div>
        ) : (
          <p>開始錄音後，逐字稿會即時顯示在這裡</p>
        )}
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* 標題列 */}
      <div className="grid grid-cols-12 border-b bg-muted/50 px-4 py-2 text-sm font-medium">
        <div className="col-span-1 text-center">時間</div>
        <div className="col-span-5 text-center">中文 (Chinese)</div>
        <div className="col-span-5 text-center">English</div>
        <div className="col-span-1 text-center">準確度</div>
      </div>

      {/* 逐字稿內容 */}
      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto"
      >
        {segments.map((segment, index) => (
          <div
            key={segment.id || index}
            className="grid grid-cols-12 border-b px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onSegmentClick?.(segment)}
          >
            {/* 時間戳 */}
            <div className="col-span-1 flex items-center justify-center text-xs text-muted-foreground">
              {formatTime(segment.startTime)}
            </div>

            {/* 中文 */}
            <div className="col-span-5 pr-4">
              <p className="text-sm leading-relaxed">{segment.text.zh}</p>
            </div>

            {/* 英文 */}
            <div className="col-span-5 pr-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {segment.text.en}
              </p>
            </div>

            {/* 信賴度 */}
            <div className="col-span-1 flex items-center justify-center">
              <Badge
                variant="outline"
                className={`${getConfidenceColor(segment.confidence)} border-current`}
              >
                {Math.round(segment.confidence * 100)}%
              </Badge>
            </div>
          </div>
        ))}

        {/* 自動捲動定位點 */}
        <div ref={endRef} />
      </div>

      {/* 底部狀態列 */}
      {isRecording && (
        <div className="border-t bg-muted/30 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>已錄製 {segments.length} 個片段</span>
          <span>即時更新中...</span>
        </div>
      )}
    </Card>
  );
}
