import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 3002;
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-production-6f7b.up.railway.app';

// 創建 HTTP 伺服器
const server = createServer();

// 處理 WebSocket 升級
const wss = new WebSocketServer({ server, path: '/' });

wss.on('connection', (ws, req) => {
  console.log(`[Proxy] New connection from ${req.socket.remoteAddress}`);

  // 連接到後端 WebSocket
  const backendWs = new WebSocket(BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://'));

  backendWs.on('open', () => {
    console.log('[Proxy] Connected to backend');
  });

  backendWs.on('message', (data) => {
    ws.send(data);
  });

  backendWs.on('error', (error) => {
    console.error('[Proxy] Backend error:', error);
    ws.close();
  });

  backendWs.on('close', () => {
    console.log('[Proxy] Backend disconnected');
    ws.close();
  });

  // 轉發客戶端訊息到後端
  ws.on('message', (data) => {
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.send(data);
    }
  });

  ws.on('error', (error) => {
    console.error('[Proxy] Client error:', error);
    backendWs.close();
  });

  ws.on('close', () => {
    console.log('[Proxy] Client disconnected');
    backendWs.close();
  });
});

server.listen(PORT, () => {
  console.log(`[Proxy] WebSocket proxy running on port ${PORT}`);
  console.log(`[Proxy] Forwarding to ${BACKEND_URL}`);
});
