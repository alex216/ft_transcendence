import { MigrationInterface, QueryRunner } from "typeorm";

// 初期マイグレーション: 全テーブルを作成する
// 実行タイミング: データベースを初めてセットアップするとき
//
// 現在は database.config.ts の synchronize: true で自動同期しているため
// 開発中はこのファイルを直接実行する必要はありません。
// 本番環境では synchronize を false にして、このマイグレーションを使用してください。
export class InitialSchema1774270819000 implements MigrationInterface {
	name = "InitialSchema1774270819000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		// =========================================================
		// 1. users テーブル
		// 認証情報・アカウント情報を管理する中心テーブル
		// =========================================================
		await queryRunner.query(`
            CREATE TABLE "users" (
                "id"                SERIAL PRIMARY KEY,
                "username"          VARCHAR NOT NULL,
                "password"          VARCHAR,
                "forty_two_id"      VARCHAR,
                "is_2fa_enabled"    BOOLEAN NOT NULL DEFAULT false,
                "two_factor_secret" VARCHAR,
                "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_username"      UNIQUE ("username"),
                CONSTRAINT "UQ_users_forty_two_id"  UNIQUE ("forty_two_id")
            )
        `);

		// =========================================================
		// 2. profiles テーブル
		// users と 1対1 のプロフィール情報
		// =========================================================
		await queryRunner.query(`
            CREATE TABLE "profiles" (
                "id"            SERIAL PRIMARY KEY,
                "user_id"       INTEGER NOT NULL,
                "displayName"   VARCHAR(50),
                "bio"           TEXT,
                "avatarUrl"     VARCHAR,
                "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_profiles_user_id"
                    FOREIGN KEY ("user_id")
                    REFERENCES "users" ("id")
                    ON DELETE CASCADE
            )
        `);

		// =========================================================
		// 3. friends テーブル
		// 承認済みフレンド関係。(user_id, friend_id) はユニーク
		// =========================================================
		await queryRunner.query(`
            CREATE TABLE "friends" (
                "id"            SERIAL PRIMARY KEY,
                "user_id"       INTEGER NOT NULL,
                "friend_id"     INTEGER NOT NULL,
                "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_friends_user_id"
                    FOREIGN KEY ("user_id")
                    REFERENCES "users" ("id")
                    ON DELETE CASCADE,
                CONSTRAINT "FK_friends_friend_id"
                    FOREIGN KEY ("friend_id")
                    REFERENCES "users" ("id")
                    ON DELETE CASCADE,
                CONSTRAINT "UQ_friends_user_friend"
                    UNIQUE ("user_id", "friend_id")
            )
        `);

		// =========================================================
		// 4. friend_requests テーブル
		// フレンド申請中のレコード。status enum で状態を管理
		// =========================================================
		await queryRunner.query(`
            CREATE TYPE "friend_request_status_enum"
                AS ENUM ('pending', 'accepted', 'rejected')
        `);

		await queryRunner.query(`
            CREATE TABLE "friend_requests" (
                "id"            SERIAL PRIMARY KEY,
                "sender_id"     INTEGER NOT NULL,
                "receiver_id"   INTEGER NOT NULL,
                "status"        "friend_request_status_enum" NOT NULL DEFAULT 'pending',
                "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_friend_requests_sender_id"
                    FOREIGN KEY ("sender_id")
                    REFERENCES "users" ("id")
                    ON DELETE CASCADE,
                CONSTRAINT "FK_friend_requests_receiver_id"
                    FOREIGN KEY ("receiver_id")
                    REFERENCES "users" ("id")
                    ON DELETE CASCADE
            )
        `);

		// =========================================================
		// 5. chat テーブル
		// チャットメッセージの履歴
		// sender は username の文字列（FK なし）
		// → ユーザー削除後もメッセージ履歴を保持するため
		// =========================================================
		await queryRunner.query(`
            CREATE TABLE "chat" (
                "id"        SERIAL PRIMARY KEY,
                "sender"    VARCHAR NOT NULL,
                "content"   TEXT NOT NULL,
                "roomId"    VARCHAR NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

		// =========================================================
		// 6. match_history テーブル
		// 対戦履歴。winnerUserId/loserUserId は nullable
		// → アカウント削除時に NULL に匿名化するため（FK制約なし）
		// =========================================================
		await queryRunner.query(`
            CREATE TABLE "match_history" (
                "id"            SERIAL PRIMARY KEY,
                "winnerUserId"  INTEGER,
                "loserUserId"   INTEGER,
                "winnerScore"   INTEGER NOT NULL,
                "loserScore"    INTEGER NOT NULL,
                "createdAt"     TIMESTAMP NOT NULL DEFAULT now()
            )
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// 作成と逆順に削除する（外部キー制約の依存関係を考慮）
		await queryRunner.query(`DROP TABLE IF EXISTS "match_history"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "chat"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "friend_requests"`);
		await queryRunner.query(`DROP TYPE IF EXISTS "friend_request_status_enum"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "friends"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "profiles"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
	}
}
