import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import session from "express-session";
import { join } from "path";
import { AppModule } from "/app/src/app.module";
import { DataSource } from "typeorm";

let app: INestApplication;
let port: number;

/**
 * テスト用アプリケーションをブートストラップする。
 * main.ts と同じセッションミドルウェアを適用し、
 * OS割り当てポートでリッスンする。
 */
export async function setupTestApp(): Promise<{
	app: INestApplication;
	port: number;
}> {
	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleFixture.createNestApplication<NestExpressApplication>();

	// 静的ファイル配信（アバターアップロード用）
	(app as NestExpressApplication).useStaticAssets(
		join(__dirname, "..", "uploads"),
		{ prefix: "/uploads/" },
	);

	// CORS設定
	app.enableCors({
		origin: "http://localhost:3001",
		credentials: true,
	});

	// cookie-parser: JWTトークンをCookieから読み取るために必要
	app.use(cookieParser());

	// グローバルバリデーションパイプ（main.tsと同じ設定）
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	// main.ts と同じセッション設定を適用
	app.use(
		session({
			secret: "test-session-secret",
			resave: false,
			saveUninitialized: false,
			cookie: {
				maxAge: 24 * 60 * 60 * 1000,
				httpOnly: true,
				secure: process.env.NODE_ENV !== "development",
			},
		}),
	);

	// OS割り当てポートでリッスン（WebSocketテスト用）
	await app.listen(0);
	const url = await app.getUrl();
	port = parseInt(url.split(":").pop(), 10);

	return { app, port };
}

export function getApp(): INestApplication {
	return app;
}

export function getPort(): number {
	return port;
}

export async function teardownTestApp(): Promise<void> {
	if (app) {
		await app.close();
	}
}

export function getDataSource(): DataSource {
	return app.get(DataSource);
}
