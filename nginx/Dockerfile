# ============================================================
# Nginx Dockerfile (multi-stage)
# ------------------------------------------------------------
# stage            | 用途
# -----------------+--------------------------------------------
# frontend-builder   vite build 実行 (prod でのみ使用)
# base               dev / prod 共通の nginx 基盤 (ModSecurity 含む)
# dev                現行の nginx.conf で起動 (Vite dev server へプロキシ)
# prod               nginx.prod.conf + frontend/dist を COPY (静的配信)
# ============================================================

# --- frontend-builder: Vite ビルドを実行して /app/dist を生成 ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app

# Vite は import.meta.env.VITE_API_URL をビルド時に静的置換するため、
# ここで明示的に指定する必要がある。未設定だと
# socketManager.ts のデフォルト http://localhost:3000 が焼き込まれ、
# 本番の CSP (connect-src 'self' wss://localhost) に違反して
# ゲームやチャットなど WebSocket 通信がブロックされる
ARG VITE_API_URL=https://localhost/api
ENV VITE_API_URL=${VITE_API_URL}

COPY .npmrc ./
COPY frontend/package*.json ./
RUN npm install && npm rebuild esbuild

COPY frontend/ .
COPY shared /shared

RUN npm run build

# --- base: dev / prod 共通の nginx 基盤 ---
FROM owasp/modsecurity-crs:nginx-alpine AS base

# root に切り替えてデフォルト server テンプレートを削除
# （コンテナ起動時に上書きされないようにする）
USER root
RUN rm /etc/nginx/templates/conf.d/default.conf.template

# ModSecurity チューニングルール（override として展開される）
COPY nginx/modsecurity-tuning.conf /etc/nginx/templates/modsecurity.d/modsecurity-override.conf.template

USER nginx

# ヘルスチェック: 実際のリスニングポート443で /healthz を確認
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -sk https://localhost:443/healthz || exit 1

# --- dev: 開発モード (Vite dev server へプロキシ) ---
FROM base AS dev
USER root
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
USER nginx

# --- prod: 本番モード (静的配信 + CSP 強化) ---
FROM base AS prod
USER root
COPY nginx/nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
USER nginx
