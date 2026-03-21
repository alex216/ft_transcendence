import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { Request, Response, NextFunction } from "express";
import { doubleCsrfProtection } from "./csrf/csrf.setup";

// Vault のレスポンス型
interface VaultSecrets {
	jwt_secret?: string;
	forty_two_client_id?: string;
	forty_two_client_secret?: string;
}

interface VaultResponse {
	data?: {
		data?: VaultSecrets;
	};
}

// Vault から秘密情報を取得して process.env に上書きする
// 未登録の場合は .env の値を Vault に登録する
// NestJS が起動する前に実行することで、全モジュールが最新の値を使える
async function loadSecretsFromVault() {
	const vaultAddr = process.env.VAULT_ADDR || "http://vault:8200";
	const vaultToken = process.env.VAULT_TOKEN || "myroot";
	const maxRetries = 10;
	const retryDelay = 3000; // 3秒

	for (let i = 1; i <= maxRetries; i++) {
		try {
			// ① Vault からシークレットを読み取る
			const response = await fetch(
				`${vaultAddr}/v1/secret/data/transcendence`,
				{
					headers: { "X-Vault-Token": vaultToken },
				},
			);

			// ② 未登録（404）なら .env の値を Vault に登録する
			if (response.status === 404) {
				console.log("🔑 Vault にシークレットが未登録のため登録します");
				const postResponse = await fetch(
					`${vaultAddr}/v1/secret/data/transcendence`,
					{
						method: "POST",
						headers: {
							"X-Vault-Token": vaultToken,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							data: {
								jwt_secret: process.env.JWT_SECRET,
								forty_two_client_id: process.env.FORTY_TWO_CLIENT_ID,
								forty_two_client_secret: process.env.FORTY_TWO_CLIENT_SECRET,
							},
						}),
					},
				);
				if (!postResponse.ok) {
					throw new Error(`Vault への登録失敗: HTTP ${postResponse.status}`);
				}
				console.log("🔐 Vault にシークレットを登録しました");
				return;
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			// ③ 登録済みなら Vault の値を process.env に上書き
			const body = (await response.json()) as VaultResponse;
			const secrets = body?.data?.data;
			if (secrets) {
				if (secrets.jwt_secret) process.env.JWT_SECRET = secrets.jwt_secret;
				if (secrets.forty_two_client_id)
					process.env.FORTY_TWO_CLIENT_ID = secrets.forty_two_client_id;
				if (secrets.forty_two_client_secret)
					process.env.FORTY_TWO_CLIENT_SECRET = secrets.forty_two_client_secret;
				console.log("🔐 Vault からシークレットを取得しました");
			}
			return;
		} catch {
			console.log(`⏳ Vault 接続待機中... (${i}/${maxRetries})`);
			if (i < maxRetries) {
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}
	}

	console.warn("⚠️  Vault に接続できませんでした。.env の値を使用します");
}

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

	// cookie-parser: リクエストのCookieを読み取れるようにする（JWTトークン取得に必要）
	app.use(cookieParser());

	// グローバルバリデーションパイプ
	// すべてのエンドポイントで自動的にDTOのバリデーションを実行する
	app.useGlobalPipes(
		new ValidationPipe({
			// DTOに定義されていないフィールドを自動削除（余計なデータを通さない）
			whitelist: true,
			// DTOに定義されていないフィールドが来たら 400 エラーを返す
			forbidNonWhitelisted: true,
			// JSON → DTOクラスのインスタンスに自動変換（デコレーターを機能させるために必要）
			transform: true,
		}),
	);

	// CSRF保護ミドルウェア
	// SKIP_AUTH=true（開発モード）のときは無効化
	if (process.env.SKIP_AUTH !== "true") {
		app.use((req: Request, res: Response, next: NextFunction) => {
			// 42 OAuthコールバックはリダイレクトなので X-CSRF-Token ヘッダーが付与できない
			// → CSRF検証をスキップ
			if (req.path === "/auth/42/callback") {
				return next();
			}
			doubleCsrfProtection(req, res, next);
		});
		console.log("🛡️  CSRF Protection: Enabled");
	} else {
		// SKIP_AUTH=true のときは認証も CSRF も無効化（開発用）
		app.use(
			(
				req: Request & { user?: unknown },
				_res: Response,
				next: NextFunction,
			) => {
				req.user = { id: 1, username: "test_user" };
				next();
			},
		);
		console.log("🚀 Development Mode: Authentication & CSRF Bypassed");
	}

	const port = process.env.PORT || 3000;
	await app.listen(port);
	console.log(`Backend is running on http://localhost:${port}`);
}

loadSecretsFromVault().then(() => bootstrap());
