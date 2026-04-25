FROM owasp/modsecurity-crs:nginx-alpine

# root に切り替えてデフォルト server テンプレートを削除
# （コンテナ起動時に上書きされないようにする）
USER root
RUN rm /etc/nginx/templates/conf.d/default.conf.template

# プロジェクトの Nginx サーバー設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ModSecurity チューニングルール（override として展開される）
COPY modsecurity-tuning.conf /etc/nginx/templates/modsecurity.d/modsecurity-override.conf.template

# nginx ユーザーに戻す
USER nginx

# ヘルスチェック: 実際のリスニングポート443で /healthz を確認
# （OWASPイメージのデフォルトは8443を参照するため上書き）
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -sk https://localhost:8443/healthz || exit 1
