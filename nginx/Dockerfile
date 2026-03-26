FROM nginx:alpine

# デフォルト設定を削除して、プロジェクトの設定を使用
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
