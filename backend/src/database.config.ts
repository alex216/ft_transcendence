import { TypeOrmModuleOptions } from "@nestjs/typeorm";

// データベース接続設定
// C++で言うと、データベースへの「接続情報」を定義する部分
export const databaseConfig: TypeOrmModuleOptions = {
	type: "postgres",
	host: process.env.DATABASE_HOST || "postgres",
	port: parseInt(process.env.DATABASE_PORT) || 5432,
	username: process.env.DATABASE_USER || "transcendence",
	password: process.env.DATABASE_PASSWORD || "password123",
	database: process.env.DATABASE_NAME || "transcendence_db",
	autoLoadEntities: true, // forFeature()で登録されたエンティティを自動ロード（globパターン不要）
	synchronize: true, // 開発時のみtrue（本番環境では危険）
	logging: process.env.NODE_ENV === "development", // 本番環境ではSQLログを無効化（テーブル構造・データの漏洩リスクを排除）
};
