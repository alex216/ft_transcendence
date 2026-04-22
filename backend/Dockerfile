# ============================================================
# NestJS バックエンド Dockerfile (multi-stage)
# ------------------------------------------------------------
# stage | 用途                          | CMD
# ------+-------------------------------+-----------------------
# dev     開発 (watch mode, bind mount)   npm run start:dev
# builder ビルド実行 (dist/ 生成)          (build のみ)
# runtime 本番配備 (軽量、devDeps 除外)    node dist/app/src/main
# ============================================================

# --- builder: nest build で dist/ を生成し、本番依存のみ残す ---
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY .npmrc ./
COPY backend/package*.json ./
RUN npm install && npm rebuild bcrypt

COPY backend/ .
# /shared は import のため nest build 時に必要
COPY shared /shared

RUN npm run build && npm prune --production

# --- dev: 開発モード (docker-compose で bind mount される前提) ---
FROM node:22-alpine AS dev
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY .npmrc ./
COPY backend/package*.json ./
RUN npm install && npm rebuild bcrypt

COPY backend/ .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# --- runtime: 本番モード (builder からビルド成果物を受け取る) ---
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/app/src/main"]
