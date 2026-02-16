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
  // 處理 CORS
  const origin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
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

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// 建立 WebSocket 伺服器
const wss = new WebSocketServer({ server, path: '/ws' });

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
