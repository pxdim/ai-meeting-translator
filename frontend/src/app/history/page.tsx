'use client';

// 會議歷史頁面

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MeetingList } from '@/components/MeetingCard';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import type { Meeting } from '@/types/meeting';

// 模擬資料 - 之後會從 API 獲取
const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: '客戶會議 - ACME 公司',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 小時前
    duration: 1800, // 30 分鐘
    audioPath: '/recordings/acme-meeting.wav',
    transcript: [
      {
        id: 'seg-1',
        startTime: 0,
        endTime: 3.5,
        text: { zh: '大家好，感謝今天來參加會議', en: 'Hello everyone, thank you for attending today' },
        confidence: 0.95,
      },
      {
        id: 'seg-2',
        startTime: 4,
        endTime: 8,
        text: { zh: '我們今天要討論新產品的路線圖', en: "Today we'll discuss the new product roadmap" },
        confidence: 0.92,
      },
    ],
    summary: '與 ACME 公司討論新產品開發計劃，確定 Q4 發布目標。',
    actionItems: ['下週前提交產品規格書', '安排設計團隊會議'],
  },
  {
    id: '2',
    title: '每週團隊站會',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26), // 昨天
    duration: 900, // 15 分鐘
    audioPath: '/recordings/daily-standup.wav',
    transcript: [],
    summary: '團隊同步進度，討論當前阻礙事項。',
  },
];

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除此會議記錄嗎？')) {
      setMeetings(prev => prev.filter(m => m.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航 */}
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold">會議歷史</h1>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container max-w-4xl py-8 px-4">
        {/* 搜尋與篩選 */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜尋會議..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            篩選
          </Button>
        </div>

        {/* 會議列表 */}
        <div className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>沒有找到符合的會議記錄</p>
            </div>
          ) : (
            <MeetingList
              meetings={filteredMeetings}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* 統計資訊 */}
        {meetings.length > 0 && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">統計資訊</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">總會議數</p>
                <p className="text-2xl font-semibold">{meetings.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">總錄音時長</p>
                <p className="text-2xl font-semibold">
                  {Math.round(meetings.reduce((sum, m) => sum + m.duration, 0) / 60)} 分
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">本月</p>
                <p className="text-2xl font-semibold">
                  {meetings.filter(m => {
                    const now = new Date();
                    const meetingDate = new Date(m.createdAt);
                    return meetingDate.getMonth() === now.getMonth();
                  }).length} 場
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
