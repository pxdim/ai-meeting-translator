FROM node:20-alpine

WORKDIR /app

# 安裝所有依賴
COPY package*.json ./
RUN npm ci

# 建置 Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
