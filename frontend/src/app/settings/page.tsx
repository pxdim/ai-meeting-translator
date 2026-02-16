'use client';

// 設定頁面 - API 金鑰設定（開發用）

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Key } from 'lucide-react';

export default function SettingsPage() {
  const [deepgramKey, setDeepgramKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [wsUrl, setWsUrl] = useState('ws://localhost:3001');

  const handleSave = () => {
    // 儲存到 localStorage（僅用於開發）
    localStorage.setItem('deepgram_api_key', deepgramKey);
    localStorage.setItem('openai_api_key', openaiKey);
    localStorage.setItem('ws_url', wsUrl);
    alert('設定已儲存！');
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
          <h1 className="ml-4 text-lg font-semibold">設定</h1>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="container max-w-2xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API 設定
            </CardTitle>
            <CardDescription>
              這些設定僅用於本地開發。生產環境的 API 金鑰由後端管理。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deepgram API */}
            <div className="space-y-2">
              <label htmlFor="deepgram-key" className="text-sm font-medium">
                Deepgram API 金鑰
              </label>
              <Input
                id="deepgram-key"
                type="password"
                placeholder="dg-..."
                value={deepgramKey}
                onChange={(e) => setDeepgramKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                用於語音辨識。前往 <a href="https://deepgram.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">deepgram.com</a> 獲取金鑰。
              </p>
            </div>

            {/* OpenAI API */}
            <div className="space-y-2">
              <label htmlFor="openai-key" className="text-sm font-medium">
                OpenAI API 金鑰
              </label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                用於翻譯和會議摘要。前往 <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a> 獲取金鑰。
              </p>
            </div>

            {/* WebSocket URL */}
            <div className="space-y-2">
              <label htmlFor="ws-url" className="text-sm font-medium">
                後端 WebSocket URL
              </label>
              <Input
                id="ws-url"
                type="text"
                placeholder="ws://localhost:3001"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
              />
            </div>

            {/* 儲存按鈕 */}
            <div className="pt-4">
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                儲存設定
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 說明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>關於安全性</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>在生產環境中，API 金鑰應該：</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>儲存在後端伺服器的環境變數中</li>
              <li>絕不暴露在前端程式碼裡</li>
              <li>透過安全的 API 端點存取</li>
            </ul>
            <p className="mt-4">
              這個設定頁面僅用於本地開發和測試目的。
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
