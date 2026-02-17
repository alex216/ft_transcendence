import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as session from "express-session";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

// メイン関数（プログラムのエントリーポイント）
// C++の int main() に相当
async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	// 静的ファイル配信の設定（アップロードされた画像など）
	app.useStaticAssets(join(__dirname, "..", "uploads"), {
		prefix: "/uploads/", // URL: http://localhost:3000/uploads/avatars/xxx.jpg
	});

	// CORS設定（フロントエンドからアクセスできるようにする）
	const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
	app.enableCors({
		origin: frontendUrl, // フロントエンドのURL
		credentials: true, // クッキーを許可
	});

	// セッション設定
	app.use(
		session({
			secret: process.env.SESSION_SECRET || "fallback-secret-key", // セッションの暗号化キー
			resave: false,
			saveUninitialized: false,
			cookie: {
				maxAge: 24 * 60 * 60 * 1000, // 24時間
				httpOnly: true,
			},
		}),
	);

	const port = process.env.PORT || 3000;
	await app.listen(port);
	console.log(`Backend is running on http://localhost:${port}`);
}

bootstrap();
