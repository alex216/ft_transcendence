# ============================================================
# React + Vite フロントエンド Dockerfile (multi-stage)
# ------------------------------------------------------------
# stage | 用途                          | CMD
# ------+-------------------------------+-----------------------
# dev     開発 (vite dev server, HMR)     npm run dev
# builder ビルド実行 (dist/ 生成)          (build のみ)
#
# 本番配備は nginx 側が builder stage の dist/ を利用する
# ため、frontend には runtime stage を持たない
# ============================================================

# --- builder: vite build で dist/ を生成 ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY .npmrc ./
COPY frontend/package*.json ./
RUN npm install && npm rebuild esbuild

COPY frontend/ .
# /shared は import のため vite build 時に必要
COPY shared /shared

RUN npm run build

# --- dev: 開発モード (docker-compose で bind mount される前提) ---
FROM node:22-alpine AS dev
WORKDIR /app

COPY .npmrc ./
COPY frontend/package*.json ./
RUN npm install && npm rebuild esbuild

COPY frontend/ .

EXPOSE 3001

CMD ["npm", "run", "dev"]
