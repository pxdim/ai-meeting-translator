// 主伺服器入口 - WebSocket + HTTP Server
// 整合 Deepgram + Gemini + Supabase
// Railway 部署就緒

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SupabaseDatabase } from './db/supabase.js';
import { handleWebSocketConnection } from './websocket/handler.js';

// 載入環境變數
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;
const RECORDINGS_PATH = process.env.RECORDINGS_PATH || join(__dirname, 'storage/recordings');

// 初始化資料庫 (Supabase)
let db: SupabaseDatabase;
try {
  db = new SupabaseDatabase();
  console.log('[Server] Supabase database connected');
} catch (error) {
  console.error('[Server] Failed to connect to Supabase:', error);
  console.error('[Server] Please check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

// 建立 HTTP 伺服器
const server = createServer(async (req, res) => {
  // 處理 WebSocket 升級請求
  if (req.url === '/ws' && req.headers.upgrade?.toLowerCase() === 'websocket') {
    // 讓 WebSocket Server 處理
    return;
  }

  // 處理 CORS
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 根路徑返回服務信息
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'AI Meeting Translator Backend',
      version: '1.0.0',
      websocket: {
        path: '/ws',
        status: 'supported'
      },
      endpoints: {
        health: '/health',
        api: '/api/meetings',
        websocket: '/ws'
      }
    }));
    return;
  }

  // 健康檢查
  if (req.url === '/health') {
    try {
      // 測試資料庫連線
      const stats = await db.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        stats,
      }));
    } catch (error) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      }));
    }
    return;
  }

  // API 路由
  if (req.url === '/api/meetings' && req.method === 'GET') {
    const meetings = await db.listMeetings(50);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(meetings));
    return;
  }

  if (req.url?.startsWith('/api/meetings/') && req.method === 'GET') {
    const id = req.url.split('/').pop();
    const data = await db.getMeetingWithSegments(id || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // 更新會議 (PUT /api/meetings/:id)
  if (req.url?.startsWith('/api/meetings/') && req.method === 'PUT') {
    const urlParts = req.url.split('/');
    const id = urlParts[3];
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        await db.updateMeeting(id, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to update meeting' }));
      }
    });
    return;
  }

  // 刪除會議 (DELETE /api/meetings/:id)
  if (req.url?.startsWith('/api/meetings/') && req.method === 'DELETE') {
    const urlParts = req.url.split('/');
    const id = urlParts[3];
    try {
      await db.deleteMeeting(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete meeting' }));
    }
    return;
  }

  // 搜尋會議 (GET /api/meetings/search?q=query)
  if (req.url?.startsWith('/api/meetings/search') && req.method === 'GET') {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const query = url.searchParams.get('q') || '';
    const results = await db.searchMeetings(query);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // 匯出功能 (GET /api/meetings/:id/export/:format)
  if (req.url?.match(/\/api\/meetings\/[^/]+\/export\/(pdf|docx|txt)$/) && req.method === 'GET') {
    const urlParts = req.url.split('/');
    const id = urlParts[3];
    const format = urlParts[5];

    // 獲取會議資料
    const data = await db.getMeetingWithSegments(id);

    if (!data.meeting || !data.segments) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Meeting not found' }));
      return;
    }

    // 根據格式生成內容
    let content = '';
    let contentType = 'text/plain';
    let filename = `${data.meeting.title || 'meeting'}`;

    if (format === 'txt') {
      content = generateTXTExport(data);
      contentType = 'text/plain; charset=utf-8';
      filename += '.txt';
    } else if (format === 'pdf' || format === 'docx') {
      // PDF 和 DOCX 目前返回 TXT 格式，等待實現
      content = generateTXTExport(data);
      contentType = 'text/plain; charset=utf-8';
      filename += `.txt`; // 暫時返回 txt
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    res.end(content);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// 處理 WebSocket 升級請求
server.on('upgrade', (request, socket, head) => {
  try {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (pathname === '/' || pathname === '/ws') {
      wss.handleUpgrade(request, socket as any, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (error) {
    socket.destroy();
  }
});

// 建立 WebSocket 伺服器 (使用 noServer 手動處理升級)
const wss = new WebSocketServer({ noServer: true, path: '/' });

// WebSocket 連線處理
wss.on('connection', (ws: WebSocket, req) => {
  console.log(`[WebSocket] New connection from ${req.socket.remoteAddress}`);

  // 傳送連線成功訊息
  ws.send(JSON.stringify({
    type: 'status',
    status: 'connected'
  }));

  // 委派給 handler 處理
  handleWebSocketConnection(ws, db);
});

wss.on('error', (error) => {
  console.error('[WebSocket] Server error:', error);
});

// 啟動伺服器
server.listen(PORT, () => {
  const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN;
  const environment = isRailway ? 'Railway' : (process.env.NODE_ENV || 'development');

  console.log(`
╔════════════════════════════════════════════════════════════╗
║           AI 會議翻譯系統 - 後端伺服器                        ║
╠════════════════════════════════════════════════════════════╣
║  HTTP Server:  http://localhost:${PORT}                      ║
║  WebSocket:    ws://localhost:${PORT}/ws                     ║
║                                                               ║
║  Environment:  ${environment.padEnd(22)}                    ║
║  Database:     Supabase                                       ║
║  Translation:  Google Gemini (${process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'})    ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down gracefully...');
  wss.clients.forEach((client) => {
    client.close();
  });
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

export { db, RECORDINGS_PATH };

// === 匯出輔助函數 ===

function generateTXTExport(data: { meeting: any; segments: any[] }): string {
  const { meeting, segments } = data;
  let output = '';

  // 標題
  output += `${'='.repeat(50)}\n`;
  output += `${meeting.title || '會議記錄'}\n`;
  output += `${'='.repeat(50)}\n\n`;

  // 會議資訊
  output += `日期：${new Date(meeting.created_at).toLocaleString('zh-TW')}\n`;
  output += `時長：${Math.floor(meeting.duration / 60)} 分 ${meeting.duration % 60} 秒\n\n`;

  // 摘要
  if (meeting.summary) {
    output += `${'-'.repeat(30)}\n`;
    output += `會議摘要\n`;
    output += `${'-'.repeat(30)}\n`;
    output += `${meeting.summary}\n\n`;
  }

  // 行動項目
  if (meeting.action_items && meeting.action_items.length > 0) {
    output += `${'-'.repeat(30)}\n`;
    output += `行動項目\n`;
    output += `${'-'.repeat(30)}\n`;
    meeting.action_items.forEach((item: string, index: number) => {
      output += `${index + 1}. ${item}\n`;
    });
    output += '\n';
  }

  // 逐字稿
  output += `${'-'.repeat(30)}\n`;
  output += `逐字稿\n`;
  output += `${'-'.repeat(30)}\n\n`;

  segments.forEach((segment: any) => {
    const time = formatTimestamp(segment.start_time);
    output += `[${time}]\n`;
    output += `中文：${segment.text_zh}\n`;
    output += `English：${segment.text_en}\n`;
    output += '\n';
  });

  return output;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
