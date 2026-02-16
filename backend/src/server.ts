// 主伺服器入口 - WebSocket + HTTP Server

import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DatabaseClient } from './db/client.js';
import { handleWebSocketConnection } from './websocket/handler.js';

// 載入環境變數
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;
const RECORDINGS_PATH = process.env.RECORDINGS_PATH || join(__dirname, 'storage/recordings');

// 初始化資料庫
const db = new DatabaseClient(process.env.DATABASE_PATH || join(__dirname, '../data/meetings.db'));
await db.initialize();

// 建立 HTTP 伺服器
const server = createServer((req, res) => {
  // 處理 CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 基本路由
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
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
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           AI 會議翻譯系統 - 後端伺服器                        ║
╠════════════════════════════════════════════════════════════╣
║  HTTP Server:  http://localhost:${PORT}                      ║
║  WebSocket:    ws://localhost:${PORT}/ws                     ║
║                                                               ║
║  Environment:  ${process.env.NODE_ENV || 'development'}                              ║
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
