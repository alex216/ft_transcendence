# ER図（ft_transcendence データベース設計）

## テーブル一覧

| テーブル名        | 対応 Entity     | 説明                              |
| ----------------- | --------------- | --------------------------------- |
| `users`           | `User`          | 認証情報・アカウント              |
| `profiles`        | `Profile`       | プロフィール情報（users と 1対1） |
| `friends`         | `Friend`        | フレンド関係（承認済み）          |
| `friend_requests` | `FriendRequest` | フレンドリクエスト（申請中）      |
| `chat`            | `Chat`          | チャットメッセージ                |
| `match_history`   | `MatchHistory`  | 対戦履歴                          |

## ER図

```mermaid
erDiagram
    users {
        int id PK "自動採番"
        varchar username UK "ユーザー名（一意）"
        varchar password "パスワードハッシュ（42OAuthは null）"
        varchar forty_two_id UK "42のユーザーID（オプション）"
        boolean is_2fa_enabled "2FA有効フラグ（default: false）"
        varchar two_factor_secret "2FAシークレット（nullable）"
        timestamp created_at "作成日時（自動）"
    }

    profiles {
        int id PK "自動採番"
        int user_id FK "users.id への外部キー"
        varchar displayName "表示名（最大50文字、nullable）"
        text bio "自己紹介（nullable）"
        varchar avatarUrl "アバター画像URL（nullable）"
        timestamp createdAt "作成日時（自動）"
        timestamp updatedAt "更新日時（自動）"
    }

    friends {
        int id PK "自動採番"
        int user_id FK "users.id への外部キー"
        int friend_id FK "users.id への外部キー"
        timestamp createdAt "フレンド成立日時（自動）"
    }

    friend_requests {
        int id PK "自動採番"
        int sender_id FK "users.id（送信者）"
        int receiver_id FK "users.id（受信者）"
        enum status "pending / accepted / rejected"
        timestamp createdAt "リクエスト送信日時（自動）"
        timestamp updatedAt "更新日時（自動）"
    }

    chat {
        int id PK "自動採番"
        varchar sender "送信者のユーザー名"
        text content "メッセージ本文"
        varchar roomId "チャットルームID"
        timestamp createdAt "送信日時（自動）"
    }

    match_history {
        int id PK "自動採番"
        int winnerUserId "勝者の users.id（nullable: 匿名化対応）"
        int loserUserId "敗者の users.id（nullable: 匿名化対応）"
        int winnerScore "勝者のスコア"
        int loserScore "敗者のスコア"
        timestamp createdAt "対戦日時（自動）"
    }

    users ||--|| profiles : "1対1（user_id → users.id）"
    users ||--o{ friends : "user_id（フレンドの一方）"
    users ||--o{ friends : "friend_id（フレンドの他方）"
    users ||--o{ friend_requests : "sender_id（送信者）"
    users ||--o{ friend_requests : "receiver_id（受信者）"
```

## リレーション説明

| リレーション                | 種類           | 説明                                                                                                                     |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `users` ↔ `profiles`        | 1対1           | 1ユーザーに1プロフィール。ユーザー削除時にCASCADE                                                                        |
| `users` ↔ `friends`         | 1対多（2経路） | `user_id` と `friend_id` の両方が `users` を参照。`(user_id, friend_id)` のペアはUNIQUE制約あり                          |
| `users` ↔ `friend_requests` | 1対多（2経路） | `sender_id`（送信者）と `receiver_id`（受信者）が `users` を参照                                                         |
| `chat`                      | 独立           | `sender` は `users.username` を文字列で保持（FK なし）。ユーザー削除時も履歴を保持                                       |
| `match_history`             | 独立（疑似FK） | `winnerUserId`/`loserUserId` は `users.id` を参照するが、FK制約なし。削除済みユーザーの試合履歴を保持するため `nullable` |

## 制約一覧

| テーブル          | 制約           | 対象列                                      |
| ----------------- | -------------- | ------------------------------------------- |
| `users`           | UNIQUE         | `username`                                  |
| `users`           | UNIQUE         | `forty_two_id`                              |
| `profiles`        | UNIQUE（暗黙） | `user_id`（OneToOneのため）                 |
| `friends`         | UNIQUE         | `(user_id, friend_id)`                      |
| `friend_requests` | ENUM           | `status`: `pending`, `accepted`, `rejected` |
