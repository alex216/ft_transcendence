# ft_transcendence Makefile
# C++の make と同じように使える

.PHONY: all setup up down build clean fclean re logs

# デフォルト: コンテナを起動
all: up

# 初回セットアップ (.envファイルを作成)
setup:
	@if [ ! -f .env ]; then \
		echo ".env ファイルを作成しています..."; \
		cp .env.sample .env; \
		echo ".env ファイルが作成されました"; \
	else \
		echo ".env ファイルは既に存在します"; \
	fi

# コンテナを起動
up:
	docker-compose up -d

# コンテナを停止
down:
	docker-compose down

# コンテナを再ビルドして起動
build:
	docker-compose up -d --build

# コンパイル生成物を削除（コンテナは残す）
clean:
	docker-compose exec backend npm run clean || true
	docker-compose exec frontend npm run clean || true
	rm -rf backend/dist
	rm -rf frontend/build  # 本番ビルド時のみ生成される
	rm -f shared/*.js shared/*.d.ts shared/*.map

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
