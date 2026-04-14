#!/bin/bash
# テスト用データベースを作成する初期化スクリプト
# PostgreSQLコンテナの起動時に自動実行される

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE transcendence_test_db;
    GRANT ALL PRIVILEGES ON DATABASE transcendence_test_db TO $POSTGRES_USER;
EOSQL

echo "Test database 'transcendence_test_db' created successfully."
