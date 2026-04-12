import * as request from "supertest";
import { setupTestApp, teardownTestApp, getApp, getDataSource } from "./setup";
import { clearDatabase } from "./helpers/db.helper";
import { createAuthenticatedAgent } from "./helpers/auth.helper";

describe("Profile Integration Tests", () => {
	beforeAll(async () => {
		await setupTestApp();
	});

	afterAll(async () => {
		await teardownTestApp();
	});

	beforeEach(async () => {
		await clearDatabase(getDataSource());
	});

	describe("GET /profile/me", () => {
		it("自分のプロフィール取得", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			const res = await agent.get("/profile/me");
			expect(res.status).toBe(200);
			expect(res.body.id).toBeDefined();
			expect(res.body.username).toBe("testuser");
		});

		it("未ログイン拒否 → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent.get("/profile/me");
			expect(res.status).toBe(401);
		});
	});

	describe("GET /profile/:id", () => {
		it("他人のプロフィール取得", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			// まず自分のIDを取得
			const meRes = await agent.get("/auth/me");
			const userId = meRes.body.id;

			// 別の認証済みagentでIDを使ってプロフィール取得
			const otherAgent = await createAuthenticatedAgent(
				getApp(),
				"otheruser",
				"pass4567",
			);
			const res = await otherAgent.get(`/profile/${userId}`);
			expect(res.status).toBe(200);
		});

		it("無効なID → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const res = await agent.get("/profile/abc");
			// コントローラは200で{ success: false }を返す
			expect(res.body.success).toBe(false);
		});
	});

	describe("PUT /profile/me", () => {
		it("プロフィール更新", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			const res = await agent
				.put("/profile/me")
				.send({ displayName: "Test User", bio: "Hello world" });

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);

			// 更新が反映されている確認
			const profileRes = await agent.get("/profile/me");
			expect(profileRes.body.displayName).toBe("Test User");
			expect(profileRes.body.bio).toBe("Hello world");
		});

		it("未ログイン拒否 → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.put("/profile/me")
				.send({ displayName: "Hacker" });
			expect(res.status).toBe(401);
		});
	});

	describe("POST /profile/avatar", () => {
		it("アバターアップロード", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			// テスト用に1x1のPNG画像を生成（最小有効PNG）
			const pngBuffer = Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			);

			const res = await agent
				.post("/profile/avatar")
				.attach("avatar", pngBuffer, "test.png");

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.avatarUrl).toContain("/uploads/avatars/");
		});

		it("非画像ファイル拒否 → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			const res = await agent
				.post("/profile/avatar")
				.attach("avatar", Buffer.from("not an image"), "test.txt");

			// fileFilterで拒否 → file=undefined → { success: false }
			expect(res.body.success).toBe(false);
		});

		it("未ログイン拒否 → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/profile/avatar")
				.attach("avatar", Buffer.from("data"), "test.png");
			expect(res.status).toBe(401);
		});
	});

	describe("DELETE /profile/avatar", () => {
		it("アバター削除", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			const res = await agent.delete("/profile/avatar");
			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
		});

		it("未ログイン拒否 → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent.delete("/profile/avatar");
			expect(res.status).toBe(401);
		});
	});
});
