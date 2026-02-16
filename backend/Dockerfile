FROM node:20-alpine

WORKDIR /app

# 安裝所有依賴 (包括 devDependencies for build)
COPY package*.json ./
RUN npm ci

# 建置 TypeScript
RUN npm run build

# 複製其餘檔案
COPY . .

EXPOSE 3001

CMD ["node", "dist/server.js"]
