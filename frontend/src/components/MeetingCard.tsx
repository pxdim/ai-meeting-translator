'use client';

// 會議卡片組件 - 顯示在歷史記錄列表中

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, FileText, Download } from 'lucide-react';
import type { Meeting } from '@/types/meeting';
import { cn } from '@/lib/utils';

interface MeetingCardProps {
  meeting: Meeting;
  onDelete?: (id: string) => void;
  className?: string;
}

export function MeetingCard({ meeting, onDelete, className = '' }: MeetingCardProps) {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} 分 ${secs} 秒`;
  };

  const getWordCount = (): number => {
    return meeting.transcript.reduce((count, segment) => {
      return count + segment.text.zh.split('').length;
    }, 0);
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{meeting.title}</CardTitle>
          {meeting.summary && (
            <Badge variant="secondary" className="ml-2">
              有筆記
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(new Date(meeting.createdAt))}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(meeting.duration)}</span>
          </div>
        </div>

        {meeting.transcript.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{meeting.transcript.length} 個片段</span>
          </div>
        )}

        {meeting.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {meeting.summary}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <Link href={`/meeting/${meeting.id}`}>
            <Button variant="outline" size="sm">
              查看詳情
            </Button>
          </Link>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" title="匯出 PDF">
              <Download className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(meeting.id)}
                className="text-destructive hover:text-destructive"
              >
                刪除
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

// 會議列表組件
interface MeetingListProps {
  meetings: Meeting[];
  onDelete?: (id: string) => void;
  className?: string;
}

export function MeetingList({ meetings, onDelete, className = '' }: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="text-muted-foreground mb-4">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>還沒有會議記錄</p>
          <p className="text-sm mt-2">點擊上方按鈕開始錄音</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', className)}>
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} onDelete={onDelete} />
      ))}
    </div>
  );
}
