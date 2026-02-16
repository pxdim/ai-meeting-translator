# 部署指南

## 部署選項

### 1. VPS 部署（推薦）

推薦使用的 VPS 服務：
- DigitalOcean ($6-12/月)
- Linode ($5/10/月)
- AWS Lightsail ($3.5-5/月)
- Vultr ($6/月)

### 2. Docker 部署（簡化）

使用 Docker Compose 一鍵部署。

## Docker 部署步驟

### 1. 準備伺服器

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安裝 Docker Compose
sudo apt install docker-compose -y
```

### 2. 設定專案

```bash
# 克隆專案
git clone your-repo-url
cd ai-meeting-translator

# 複製環境變數檔案
cp backend/.env.example backend/.env

# 編輯環境變數
nano backend/.env
```

### 3. 建立並啟動服務

```bash
docker-compose up -d --build
```

### 4. 設定 Nginx（可選）

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/ai-meeting
```

Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端靜態檔案
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 後端 API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket 支援
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# 啟用配置
sudo ln -s /etc/nginx/sites-available/ai-meeting /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL 證書（推薦）

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 環境變數

### 後端 (.env)

```env
# 伺服器設定
NODE_ENV=production
PORT=3001

# API 金鑰
DEEPGRAM_API_KEY=your_deepgram_api_key
OPENAI_API_KEY=your_openai_api_key

# 資料庫
DATABASE_PATH=/app/data/meetings.db

# 儲存路徑
RECORDINGS_PATH=/app/storage/recordings

# CORS（如果需要）
CORS_ORIGIN=https://your-domain.com
```

## 監控與維護

### 檢查日誌

```bash
# 查看所有服務日誌
docker-compose logs -f

# 查看特定服務
docker-compose logs -f frontend
docker-compose logs -f backend
```

### 重啟服務

```bash
docker-compose restart
```

### 更新部署

```bash
git pull
docker-compose up -d --build
```

### 備份

```bash
# 備份資料庫和錄音檔案
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data backend/storage/recordings

# 上傳到雲端儲存（可選）
# scp backup-*.tar.gz user@backup-server:/backups/
```

## 安全建議

### 1. 防火牆設定

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. 密碼保護（可選）

如果需要在公開網路上使用，建議加入簡單的密碼保護：

```typescript
// backend/src/middleware/auth.ts
export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${process.env.ACCESS_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
```

### 3. 限流

```bash
# 使用 nginx 限流
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

## 故障排除

### 無法連線

1. 檢查防火牆設定
2. 確認 Docker 容器正在運行
3. 查看 Nginx 日誌

### WebSocket 連線失敗

1. 確認 Nginx 配置中的 WebSocket 升級設定
2. 檢查 CORS 設定

### API 錯誤

1. 驗證 API 金鑰正確
2. 檢查 API 使用量限制
3. 查看後端日誌

## 成本估算

### VPS 主機

- **DigitalOcean**: $6/月 (1GB RAM, 1 vCPU)
- **AWS Lightsail**: $5/月 (512MB RAM, 1 vCPU)
- **Linode**: $5/月 (1GB RAM, 1 vCPU)

### API 成本

- **Deepgram**: $0.54/小時
- **OpenAI**: $0.15-0.20/小時
- **每月 20 小時**: 約 $15

### 總計

- **主機**: $5-10/月
- **API**: $15/月
- **總成本**: $20-25/月
