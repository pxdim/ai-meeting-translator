'use client';

// 會議歷史頁面

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MeetingList } from '@/components/MeetingCard';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import type { Meeting } from '@/types/meeting';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function HistoryPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 獲取會議列表
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/meetings?limit=50`);

        if (!response.ok) {
          throw new Error('無法載入會議列表');
        }

        const data = await response.json();

        // 轉換資料格式
        const formattedMeetings: Meeting[] = data.map((m: any) => ({
          id: m.id,
          title: m.title,
          createdAt: new Date(m.created_at),
          duration: m.duration,
          audioPath: m.audio_path,
          transcript: [], // 歷史頁面不載入逐字稿
          summary: m.summary,
          actionItems: m.action_items || [],
        }));

        setMeetings(formattedMeetings);
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    meeting.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此會議記錄嗎？')) return;

    try {
      const response = await fetch(`${API_URL}/api/meetings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMeetings(prev => prev.filter(m => m.id !== id));
      } else {
        alert('刪除失敗');
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('刪除失敗');
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
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>載入中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{searchQuery ? '沒有找到符合的會議記錄' : '還沒有會議記錄'}</p>
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
