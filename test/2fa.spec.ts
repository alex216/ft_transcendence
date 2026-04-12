import * as request from "supertest";
import * as speakeasy from "speakeasy";
import { setupTestApp, teardownTestApp, getApp, getDataSource } from "./setup";
import { clearDatabase } from "./helpers/db.helper";
import {
	createAuthenticatedAgent,
	registerUser,
	loginUser,
} from "./helpers/auth.helper";

describe("2FA Integration Tests", () => {
	beforeAll(async () => {
		await setupTestApp();
	});

	afterAll(async () => {
		await teardownTestApp();
	});

	beforeEach(async () => {
		await clearDatabase(getDataSource());
	});

	/**
	 * ヘルパー: 認証済みagentで2FAセットアップを実行し、DB上のsecretを取得する。
	 * generateSecret()はQRコードのみ返すので、secretはDBから直接取得する。
	 */
	async function setup2FA(
		agent: ReturnType<typeof request.agent>,
		username: string,
	) {
		// 2FA setup — secretがDBに保存される
		const setupRes = await agent.post("/auth/2fa/setup");
		expect(setupRes.status).toBe(201);
		expect(setupRes.body.qrCodeUrl).toBeDefined();

		// DBからsecretを取得
		const ds = getDataSource();
		const rows = await ds.query(
			'SELECT two_factor_secret FROM "users" WHERE username = $1',
			[username],
		);
		const secret = rows[0].two_factor_secret;
		expect(secret).toBeTruthy();

		return { setupRes, secret };
	}

	/**
	 * ヘルパー: secretからTOTPトークンを生成する。
	 */
	function generateToken(secret: string): string {
		return speakeasy.totp({
			secret,
			encoding: "base32",
		});
	}

	// ─── POST /auth/2fa/setup ────────────────────────

	describe("POST /auth/2fa/setup", () => {
		it("認証済みユーザーがQRコード取得 → 201", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			const res = await agent.post("/auth/2fa/setup");
			expect(res.status).toBe(201);
			expect(res.body.qrCodeUrl).toBeDefined();
			// QRコードURLはdata:image形式
			expect(res.body.qrCodeUrl).toContain("data:image");
		});

		it("未認証でsetup → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent.post("/auth/2fa/setup");
			expect(res.status).toBe(401);
		});
	});

	// ─── POST /auth/2fa/enable ───────────────────────

	describe("POST /auth/2fa/enable", () => {
		it("正しいTOTPトークンで有効化 → 201", async () => {
			const username = "testuser";
			const agent = await createAuthenticatedAgent(
				getApp(),
				username,
				"pass1234",
			);

			const { secret } = await setup2FA(agent, username);
			const token = generateToken(secret);

			const res = await agent.post("/auth/2fa/enable").send({ token });
			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);

			// DBでis_2fa_enabledがtrueになっている
			const ds = getDataSource();
			const rows = await ds.query(
				'SELECT is_2fa_enabled FROM "users" WHERE username = $1',
				[username],
			);
			expect(rows[0].is_2fa_enabled).toBe(true);
		});

		it("不正なトークンで有効化 → success: false", async () => {
			const username = "testuser";
			const agent = await createAuthenticatedAgent(
				getApp(),
				username,
				"pass1234",
			);

			await setup2FA(agent, username);

			const res = await agent
				.post("/auth/2fa/enable")
				.send({ token: "000000" });
			// コントローラは201で{ success: false }を返す
			expect(res.body.success).toBe(false);
		});

		it("未認証でenable → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/2fa/enable")
				.send({ token: "123456" });
			expect(res.status).toBe(401);
		});
	});

	// ─── POST /auth/2fa/verify（ログイン時2FA検証）───

	describe("POST /auth/2fa/verify", () => {
		/**
		 * ヘルパー: ユーザーを作成→2FAを有効化→ログアウトして、
		 * 2FA付きログインが必要な状態にする。secretを返す。
		 */
		async function setupUserWith2FA() {
			const username = "user2fa";
			const password = "pass1234";

			// 登録・ログイン・2FAセットアップ・有効化
			const agent = await createAuthenticatedAgent(
				getApp(),
				username,
				password,
			);
			const { secret } = await setup2FA(agent, username);
			const token = generateToken(secret);
			await agent.post("/auth/2fa/enable").send({ token });

			// ログアウト
			await agent.post("/auth/logout");

			return { username, password, secret };
		}

		it("2FA有効ユーザーのログイン → 2FA_REQUIREDレスポンス", async () => {
			const { username, password } = await setupUserWith2FA();

			const agent = request.agent(getApp().getHttpServer());
			const loginRes = await loginUser(agent, username, password);
			expect(loginRes.status).toBe(201);
			expect(loginRes.body.message).toBe("2FA_REQUIRED");
		});

		it("正しいTOTPコードでverify → 200/201 + 認証成功", async () => {
			const { username, password, secret } = await setupUserWith2FA();

			const agent = request.agent(getApp().getHttpServer());
			// ステップ1: ログイン → temp_token Cookie取得
			await loginUser(agent, username, password);

			// ステップ2: TOTPで2FA検証
			const token = generateToken(secret);
			const verifyRes = await agent.post("/auth/2fa/verify").send({ token });
			expect([200, 201]).toContain(verifyRes.status);
			expect(verifyRes.body.success).toBe(true);

			// ステップ3: 認証済みとして/auth/meにアクセス可能
			const meRes = await agent.get("/auth/me");
			expect(meRes.status).toBe(200);
			expect(meRes.body.username).toBe(username);
		});

		it("不正なTOTPコードでverify → success: false", async () => {
			const { username, password } = await setupUserWith2FA();

			const agent = request.agent(getApp().getHttpServer());
			await loginUser(agent, username, password);

			const verifyRes = await agent
				.post("/auth/2fa/verify")
				.send({ token: "000000" });
			// コントローラは201で{ success: false }を返す
			expect(verifyRes.body.success).toBe(false);
		});

		it("temp_tokenなしでverify → success: false", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/2fa/verify")
				.send({ token: "123456" });
			// セッションが無効の場合もsuccess: falseで返す
			expect(res.body.success).toBe(false);
		});
	});

	// ─── POST /auth/2fa/disable ──────────────────────

	describe("POST /auth/2fa/disable", () => {
		it("2FA無効化 → 201 + 通常ログインに戻る", async () => {
			const username = "testuser";
			const password = "pass1234";

			// 2FA有効化
			const agent = await createAuthenticatedAgent(
				getApp(),
				username,
				password,
			);
			const { secret } = await setup2FA(agent, username);
			const token = generateToken(secret);
			await agent.post("/auth/2fa/enable").send({ token });

			// 2FA無効化
			const disableRes = await agent.post("/auth/2fa/disable");
			expect(disableRes.status).toBe(201);
			expect(disableRes.body.success).toBe(true);

			// ログアウト→再ログインで2FA不要
			await agent.post("/auth/logout");
			const freshAgent = request.agent(getApp().getHttpServer());
			const loginRes = await loginUser(freshAgent, username, password);
			expect(loginRes.status).toBe(201);
			// 2FA_REQUIREDではなく通常ログイン成功
			expect(loginRes.body.message).not.toBe("2FA_REQUIRED");
		});

		it("未認証でdisable → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent.post("/auth/2fa/disable");
			expect(res.status).toBe(401);
		});
	});

	// ─── 2FA無効ユーザーの通常ログイン ───────────────

	describe("2FA無効ユーザーの挙動", () => {
		it("2FA未設定ユーザーは通常ログインでverify不要", async () => {
			const username = "normaluser";
			const password = "pass1234";

			const regAgent = request.agent(getApp().getHttpServer());
			await registerUser(regAgent, username, password);

			const loginAgent = request.agent(getApp().getHttpServer());
			const loginRes = await loginUser(loginAgent, username, password);
			expect(loginRes.status).toBe(201);
			expect(loginRes.body.success).toBe(true);
			expect(loginRes.body.message).not.toBe("2FA_REQUIRED");

			// そのまま/auth/meにアクセス可能
			const meRes = await loginAgent.get("/auth/me");
			expect(meRes.status).toBe(200);
		});
	});
});
