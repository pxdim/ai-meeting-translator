'use client';

// 首頁 - 顯示錄音按鈕和最近會議

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RecordingButton, StatusIndicator } from '@/components/RecordingButton';
import { MeetingList } from '@/components/MeetingCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, History } from 'lucide-react';
import type { Meeting } from '@/types/meeting';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function HomePage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 獲取最近會議
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/meetings?limit=5`);

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
          transcript: [], // 首頁不載入逐字稿
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

  // 開始錄音 - 導航到錄音頁面
  const handleStartRecording = () => {
    router.push('/recording');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* 頂部導航 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎙️</span>
            <h1 className="text-xl font-semibold">AI 會議翻譯助手</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status={isConnected ? 'connected' : 'disconnected'} />
            <Button variant="ghost" size="icon" asChild>
              <Link href="/history">
                <History className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container max-w-4xl py-12 px-4">
        {/* 錄音按鈕區域 */}
        <section className="mb-16">
          <Card className="border-none shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <RecordingButton
                isRecording={false}
                onStart={handleStartRecording}
                onStop={() => {}}
              />
              <p className="mt-6 text-muted-foreground text-center">
                點擊上方按鈕開始錄音<br />
                <span className="text-sm">支援中英文混合語音辨識與即時翻譯</span>
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 最近會議 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">最近會議</h2>
            <Button variant="outline" asChild>
              <Link href="/history">
                <History className="h-4 w-4 mr-2" />
                查看全部
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>載入中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : (
            <MeetingList meetings={meetings} />
          )}
        </section>
      </main>

      {/* 頁尾 */}
      <footer className="border-t py-6 mt-16">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>AI 會議翻譯系統 · 個人專用</p>
        </div>
      </footer>
    </div>
  );
}
