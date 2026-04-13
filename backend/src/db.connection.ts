// DB接続共通設定
// database.config.ts（NestJS用）と data-source.ts（TypeORM CLI用）で共有する
export const dbConnectionConfig = {
	type: "postgres" as const,
	host: process.env.DATABASE_HOST || "postgres",
	port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
	username: process.env.DATABASE_USER || "transcendence",
	password: process.env.DATABASE_PASSWORD || "password123",
	database: process.env.DATABASE_NAME || "transcendence_db",
};
