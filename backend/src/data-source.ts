import { DataSource } from "typeorm";
import { dbConnectionConfig } from "./db.connection";

// TypeORM CLI 専用の DataSource 設定
// NestJS アプリ起動時には使われず、migration:run / migration:revert / migration:show コマンドで使用する
//
// database.config.ts との違い:
//   - synchronize: false  → 自動同期を無効化（マイグレーションで手動管理）
//   - entities/migrations → コンパイル済み JS ファイルのパスを指定（ts-node 不要）
export const AppDataSource = new DataSource({
	...dbConnectionConfig,
	synchronize: false,
	logging: true,
	entities: ["dist/app/src/**/*.entity.js"],
	migrations: ["dist/app/src/migrations/*.js"],
});
