import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-production-9445.up.railway.app';

// WebSocket 代理
const wsProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  ws: true,
  logLevel: 'info',
  onProxyReqWs: (proxyReq, req, socket) => {
    // 修改請求以支持 WebSocket
    proxyReq.setHeader('Origin', BACKEND_URL);
  },
  onProxyReq: (proxyReq, req, res) => {
    // 添加 forward headers
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host || '');
    proxyReq.setHeader('X-Real-IP', req.socket.remoteAddress || '');
  },
});

app.use('/', wsProxy);

app.listen(PORT, () => {
  console.log(`WebSocket Gateway running on port ${PORT}`);
  console.log(`Proxying to ${BACKEND_URL}`);
});
