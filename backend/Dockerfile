# 後端 Dockerfile

FROM node:20-alpine

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --only=production

# 複製原始碼
COPY . .

# 建置 TypeScript
RUN npm run build

# 建立必要目錄
RUN mkdir -p data src/storage/recordings

EXPOSE 3001

CMD ["node", "dist/server.js"]
