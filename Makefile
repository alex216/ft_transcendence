# ft_transcendence Makefile
# C++の make と同じように使える

.PHONY: all setup ssl up down build clean fclean re logs reinstall

# デフォルト: コンテナを起動
all: up

# 初回セットアップ (.envファイルを作成 + SSL証明書生成 + ディレクトリ準備)
setup: ssl
	@if [ ! -f .env ]; then \
		echo ".env ファイルを作成しています..."; \
		cp .env.sample .env; \
		sed -i "s/csrf_secret_key_here/$$(openssl rand -hex 32)/" .env; \
		sed -i "s/jwt_secret_key_here/$$(openssl rand -hex 32)/" .env; \
		echo ".env ファイルが作成されました（CSRF_SECRET・JWT_SECRETを自動生成）"; \
	else \
		echo ".env ファイルは既に存在します"; \
	fi
	@$(MAKE) _prepare-dirs
	@echo "📦 npm install を実行しています（husky / lint-staged のセットアップ）..."
	npm install
	@echo "✅ git フック（lint-staged）が有効になりました"

# uploadsディレクトリをホスト側（現在のユーザー権限）で事前作成する
# 理由: Docker が root 権限でディレクトリを作る前に
#       ホストユーザーが先に作ることで root 所有になるのを防ぐ
_prepare-dirs:
	@if [ -d backend/uploads ] && [ ! -w backend/uploads ]; then \
		echo "⚠️  backend/uploads/ が root 権限です。削除して再作成します..."; \
		rm -rf backend/uploads; \
	fi
	@mkdir -p backend/uploads/avatars
	@touch backend/uploads/.gitkeep
	@echo "✅ backend/uploads/ を準備しました (owner: $$(whoami))"

# SSL証明書を生成（開発用オレオレ証明書）
# 使い方: make ssl
ssl:
	@mkdir -p nginx/ssl
	@if [ -f nginx/ssl/server.crt ]; then \
		echo "✅ SSL証明書は既に存在します (nginx/ssl/server.crt)"; \
	else \
		echo "🔐 SSL証明書を生成しています..."; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout nginx/ssl/server.key \
			-out nginx/ssl/server.crt \
			-subj "/C=JP/ST=Tokyo/L=Tokyo/O=42Tokyo/CN=localhost"; \
		echo "✅ SSL証明書を生成しました (nginx/ssl/)"; \
		echo "⚠️  ブラウザで https://localhost を開くと警告が出ます"; \
		echo "   「詳細設定」→「localhost にアクセスする（安全でない）」で続行できます"; \
	fi

# コンテナを起動
up: _prepare-dirs
	docker-compose up -d

# コンテナを停止
down:
	docker-compose down

# コンテナを再ビルドして起動
build: _prepare-dirs
	docker-compose up -d --build

# コンパイル生成物を削除（コンテナは残す）
clean:
	docker-compose exec backend npm run clean || true
	docker-compose exec frontend npm run clean || true
	rm -rf backend/dist
	rm -rf frontend/build  # 本番ビルド時のみ生成される
	rm -f shared/*.js shared/*.d.ts shared/*.map

# node_modules ボリュームを再作成してコンテナを再ビルド
# package.json に新しいパッケージを追加した後に使う
# 使い方: make reinstall
reinstall: down
	docker volume rm -f $$(docker volume ls -q | grep frontend_node_modules) 2>/dev/null || true
	docker volume rm -f $$(docker volume ls -q | grep backend_node_modules) 2>/dev/null || true
	docker-compose up -d --build
	@echo "✅ node_modules を再インストールしてコンテナを再起動しました"

# 完全クリーン（コンテナとボリュームも削除）
fclean: down
	docker-compose down -v
	docker-compose rm -f
	rm -rf backend/dist backend/node_modules backend/uploads
	rm -rf frontend/build frontend/node_modules  # build/は通常存在しない
	rm -f shared/*.js shared/*.d.ts shared/*.map
	docker system prune -f

# 完全クリーン後に再ビルド
re: fclean build

# ログを表示
logs:
	docker-compose logs -f

# 本番ビルドを作成（開発には不要）
prod-build:
	docker-compose exec backend npm run build
	docker-compose exec frontend npm run build
	@echo "本番ビルド完了: backend/dist/, frontend/build/"
