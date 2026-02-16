'use client';

// 會議詳情頁面 - 顯示完整逐字稿、摘要和行動項目

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, Clock, FileText, Download, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import type { Meeting, TranscriptSegment } from '@/types/meeting';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 獲取會議資料
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/meetings/${meetingId}`);

        if (!response.ok) {
          throw new Error('無法載入會議資料');
        }

        const data = await response.json();

        // 轉換資料格式
        const meetingData: Meeting = {
          id: data.meeting?.id || meetingId,
          title: data.meeting?.title || '會議記錄',
          createdAt: new Date(data.meeting?.created_at || Date.now()),
          duration: data.meeting?.duration || 0,
          audioPath: data.meeting?.audio_path || '',
          transcript: data.segments?.map((s: any) => ({
            id: s.id,
            startTime: s.start_time,
            endTime: s.end_time,
            text: {
              zh: s.text_zh,
              en: s.text_en,
            },
            confidence: s.confidence,
            speaker: s.speaker,
          })) || [],
          summary: data.meeting?.summary,
          actionItems: data.meeting?.action_items || [],
        };

        setMeeting(meetingData);
        setSegments(meetingData.transcript);
        setEditedTitle(meetingData.title);
      } catch (err) {
        console.error('Error fetching meeting:', err);
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setLoading(false);
      }
    };

    if (meetingId) {
      fetchMeeting();
    }
  }, [meetingId]);

  // 更新會議標題
  const handleSaveTitle = async () => {
    if (!meeting || !editedTitle.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editedTitle }),
      });

      if (response.ok) {
        setMeeting({ ...meeting, title: editedTitle });
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating title:', err);
    }
  };

  // 刪除會議
  const handleDelete = async () => {
    if (!confirm('確定要刪除此會議記錄嗎？此操作無法復原。')) return;

    try {
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/history');
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
      alert('刪除失敗');
    }
  };

  // 匯出功能
  const handleExport = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/export/${format}`);

      if (!response.ok) throw new Error('匯出失敗');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting?.title || 'meeting'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('匯出功能尚未實現，請等待後端 API 完成');
    }
  };

  // 格式化日期
  const formatDate = (date: Date): string => {
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化時長
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} 分 ${secs} 秒`;
  };

  // 格式化時間戳
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 搜尋過濾
  const filteredSegments = segments.filter(segment =>
    segment.text.zh.toLowerCase().includes(searchQuery.toLowerCase()) ||
    segment.text.en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || '找不到此會議'}</p>
            <Link href="/history">
              <Button>返回歷史記錄</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 頂部導航 */}
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/history">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-lg font-semibold">會議詳情</h1>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container max-w-6xl py-8 px-4">
        {/* 會議標題區 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-2xl font-semibold h-auto py-2"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveTitle}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIsEditing(false);
                      setEditedTitle(meeting.title);
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl">{meeting.title}</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('docx')}>
                  <Download className="h-4 w-4 mr-2" />
                  DOCX
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('txt')}>
                  <Download className="h-4 w-4 mr-2" />
                  TXT
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(meeting.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(meeting.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>{segments.length} 個片段</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左側：摘要與行動項目 */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI 摘要 */}
            {meeting.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI 會議摘要</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{meeting.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* 行動項目 */}
            {meeting.actionItems && meeting.actionItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">行動項目</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {meeting.actionItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* 統計資訊 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">統計資訊</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">中文字數</span>
                  <span className="font-medium">
                    {segments.reduce((sum, s) => sum + s.text.zh.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">英文字數</span>
                  <span className="font-medium">
                    {segments.reduce((sum, s) => sum + s.text.en.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均準確度</span>
                  <span className="font-medium">
                    {segments.length > 0
                      ? Math.round((segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length) * 100)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側：逐字稿 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">逐字稿</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜尋逐字稿..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredSegments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchQuery ? '沒有找到符合的內容' : '暫無逐字稿'}
                    </p>
                  ) : (
                    filteredSegments.map((segment) => (
                      <div
                        key={segment.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatTime(segment.startTime)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(segment.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">中文</p>
                            <p className="text-sm">{segment.text.zh}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">English</p>
                            <p className="text-sm text-muted-foreground">{segment.text.en}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
