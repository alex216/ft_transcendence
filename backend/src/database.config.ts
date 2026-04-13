import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { dbConnectionConfig } from "./db.connection";

// データベース接続設定
// C++で言うと、データベースへの「接続情報」を定義する部分
export const databaseConfig: TypeOrmModuleOptions = {
	...dbConnectionConfig,
	autoLoadEntities: true, // forFeature()で登録されたエンティティを自動ロード（globパターン不要）
	synchronize: process.env.NODE_ENV !== "production", // 本番環境では false（マイグレーションで管理）
	logging: process.env.NODE_ENV === "development", // 本番環境ではSQLログを無効化（テーブル構造・データの漏洩リスクを排除）
};
