# ft_transcendence MVP

42 school project - 最小実装版

## 機能

- ユーザー登録
- ログイン/ログアウト
- セッション管理

## 🚀 クイックスタート

```bash
# 1. 環境変数ファイルを作成
make setup

# 2. アプリケーションを起動
make build

# 3. ブラウザでアクセス
# http://localhost:3001
```

詳細は [SETUP.md](./SETUP.md) を参照してください。

## 技術スタック

- **Backend**: NestJS (TypeScript)
- **Frontend**: React
- **Database**: PostgreSQL
- **Containerization**: Docker & docker-compose

## プロジェクト構造

```text
.
├── backend/              # NestJSバックエンド
│   ├── src/
│   │   ├── auth/        # 認証機能
│   │   ├── user/        # ユーザーエンティティ
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── database.config.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/             # Reactフロントエンド
│   ├── src/
│   │   ├── App.js       # メインコンポーネント
│   │   ├── App.css      # スタイル
│   │   ├── api.js       # API通信
│   │   └── index.js
│   ├── public/
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml    # Docker設定
```

1. バックエンド（backend/）

- src/main.ts - アプリケーションのエントリーポイント
- src/app.module.ts - ルートモジュール
- src/database.config.ts - PostgreSQL接続設定
- src/user/user.entity.ts - ユーザーテーブル定義
- src/auth/auth.service.ts - 認証ロジック（登録・ログイン）
- src/auth/auth.controller.ts - APIエンドポイント
- src/auth/auth.module.ts - 認証モジュール

2. フロントエンド（frontend/）

- src/index.js - Reactのエントリーポイント
- src/App.js - メインコンポーネント（UI）
- src/App.css - スタイル
- src/api.js - バックエンドとの通信

3. インフラ

- docker-compose.yml - 3つのコンテナ（PostgreSQL、バックエンド、フロントエンド）
- backend/Dockerfile - バックエンドのDocker設定
- frontend/Dockerfile - フロントエンドのDocker設定

## セットアップ方法

### 1. 必要なもの

- Docker
- Docker Compose

### 2. 起動

```bash
# プロジェクトのルートディレクトリで実行
docker-compose up --build
```

初回起動時は、各コンテナのビルドとnpmパッケージのインストールに数分かかります。

### 3. アクセス

起動完了後、以下のURLにアクセスできます：

- **フロントエンド**: http://localhost:3001
- **バックエンドAPI**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### 4. 使い方

1. ブラウザで http://localhost:3001 を開く
2. 「登録」タブでユーザー名とパスワードを入力して登録
3. 「ログイン」タブでログイン
4. ログイン後、ユーザー情報が表示される

## 停止方法

```bash
# コンテナを停止
docker-compose down

# データベースのデータも削除する場合
docker-compose down -v
```

## API仕様

### ユーザー登録

- **URL**: `POST /auth/register`
- **Body**: `{ "username": "string", "password": "string" }`
- **Response**: `{ "success": true, "message": "登録成功", "user": {...} }`

### ログイン

- **URL**: `POST /auth/login`
- **Body**: `{ "username": "string", "password": "string" }`
- **Response**: `{ "success": true, "message": "ログイン成功", "user": {...} }`
- **Note**: セッションクッキーが設定される

### 現在のユーザー取得

- **URL**: `GET /auth/me`
- **Response**: `{ "id": number, "username": "string" }`
- **Note**: ログイン必須

### ログアウト

- **URL**: `POST /auth/logout`
- **Response**: `{ "success": true, "message": "ログアウト成功" }`

## データベース構造

### users テーブル

| カラム名   | 型        | 説明                   |
| ---------- | --------- | ---------------------- |
| id         | integer   | 主キー（自動採番）     |
| username   | varchar   | ユーザー名（ユニーク） |
| password   | varchar   | パスワード（平文）     |
| created_at | timestamp | 作成日時               |

## セキュリティ上の注意

⚠️ **この実装はMVP（最小実装）です。本番環境では以下の対応が必要です：**

- パスワードのハッシュ化（bcryptなど）
- JWT認証の実装
- HTTPS通信
- CSRF対策
- XSS対策
- SQLインジェクション対策（TypeORMである程度は対応済み）
- 入力値のバリデーション強化

## トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のポートを確認
lsof -i :3000  # バックエンド
lsof -i :3001  # フロントエンド
lsof -i :5432  # PostgreSQL

# プロセスを終了させるか、docker-compose.ymlのポート番号を変更
```

### データベース接続エラー

```bash
# コンテナの状態を確認
docker-compose ps

# ログを確認
docker-compose logs postgres
docker-compose logs backend

# データベースを再作成
docker-compose down -v
docker-compose up --build
```

### npm installエラー

```bash
# node_modulesを削除して再ビルド
docker-compose down
rm -rf backend/node_modules frontend/node_modules
docker-compose up --build
```

## 次のステップ

MVPが動作したら、以下の機能を追加できます：

1. **セキュリティ強化**
   - パスワードハッシュ化
   - JWT認証

2. **Pongゲーム**
   - Canvas APIでゲーム画面作成
   - WebSocketで対戦機能

3. **チャット機能**
   - WebSocketでリアルタイムチャット

4. **プロフィール機能**
   - ユーザープロフィール表示・編集
   - アバター画像

5. **試合履歴**
   - 過去の試合記録
   - 統計情報

## 開発メモ

### Web開発の基本概念

- **HTTP**: クライアント（ブラウザ）とサーバー間の通信プロトコル
- **REST API**: HTTPメソッド（GET, POST, PUT, DELETE）でデータをやり取り
- **セッション**: ログイン状態を保持する仕組み
- **クッキー**: ブラウザがサーバーからの情報を保存する場所
- **CORS**: 異なるドメイン間の通信を許可する設定

### TypeScript/JavaScript

- **async/await**: 非同期処理（C++のコールバック関数に似ている）
- **Promise**: 非同期処理の結果を表すオブジェクト
- **デコレータ**: `@` で始まる記法（NestJSで使用）

### React

- **コンポーネント**: 再利用可能なUI部品
- **state**: コンポーネント内の状態管理
- **props**: 親から子へのデータ受け渡し
- **hooks**: useState, useEffect など（関数コンポーネントで状態管理）
