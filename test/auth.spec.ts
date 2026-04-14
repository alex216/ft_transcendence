import * as request from "supertest";
import { setupTestApp, teardownTestApp, getApp, getDataSource } from "./setup";
import { clearDatabase } from "./helpers/db.helper";
import {
	registerUser,
	loginUser,
	createAuthenticatedAgent,
} from "./helpers/auth.helper";

describe("Auth Integration Tests", () => {
	beforeAll(async () => {
		await setupTestApp();
	});

	afterAll(async () => {
		await teardownTestApp();
	});

	beforeEach(async () => {
		await clearDatabase(getDataSource());
	});

	describe("POST /auth/register", () => {
		it("ユーザー登録成功", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await registerUser(agent, "testuser", "password123");

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.user).toBeDefined();
			expect(res.body.user.username).toBe("testuser");
			expect(res.body.user.id).toBeDefined();
		});

		it("重複ユーザー名拒否", async () => {
			const agent = request.agent(getApp().getHttpServer());
			await registerUser(agent, "testuser", "password123");

			const res = await registerUser(agent, "testuser", "otherpass");
			// コントローラは200で{ success: false }を返す
			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/login", () => {
		it("ログイン成功", async () => {
			const agent = request.agent(getApp().getHttpServer());
			await registerUser(agent, "testuser", "password123");

			const res = await loginUser(agent, "testuser", "password123");
			expect(res.status).toBe(201); // NestJS POST default
			expect(res.body.success).toBe(true);
			expect(res.body.user.username).toBe("testuser");
			// セッションCookieが設定されている
			expect(res.headers["set-cookie"]).toBeDefined();
		});

		it("パスワード誤り", async () => {
			const agent = request.agent(getApp().getHttpServer());
			await registerUser(agent, "testuser", "password123");

			const res = await loginUser(agent, "testuser", "wrongpassword");
			// コントローラは200/201で{ success: false }を返す
			expect(res.body.success).toBe(false);
		});
	});

	describe("GET /auth/me", () => {
		it("認証済みユーザー取得", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password123",
			);

			const res = await agent.get("/auth/me");
			expect(res.status).toBe(200);
			expect(res.body.id).toBeDefined();
			expect(res.body.username).toBe("testuser");
		});

		it("未ログインでme → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent.get("/auth/me");
			expect(res.status).toBe(401);
		});
	});

	describe("POST /auth/logout", () => {
		it("ログアウト後にmeが401", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password123",
			);

			// ログアウト
			const logoutRes = await agent.post("/auth/logout");
			expect(logoutRes.status).toBe(201); // NestJS POST default

			// セッションクリア確認
			const meRes = await agent.get("/auth/me");
			expect(meRes.status).toBe(401);
		});
	});

	describe("セッション独立性", () => {
		it("別ユーザーのセッションに影響しない", async () => {
			const agent1 = await createAuthenticatedAgent(
				getApp(),
				"user1",
				"password1",
			);
			const agent2 = await createAuthenticatedAgent(
				getApp(),
				"user2",
				"password2",
			);

			const res1 = await agent1.get("/auth/me");
			const res2 = await agent2.get("/auth/me");

			expect(res1.body.username).toBe("user1");
			expect(res2.body.username).toBe("user2");

			// user1がログアウトしてもuser2は影響なし
			await agent1.post("/auth/logout");
			const afterLogout = await agent2.get("/auth/me");
			expect(afterLogout.body.username).toBe("user2");
		});
	});
});
