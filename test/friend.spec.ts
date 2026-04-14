import * as request from "supertest";
import { setupTestApp, teardownTestApp, getApp, getDataSource } from "./setup";
import { clearDatabase } from "./helpers/db.helper";
import { createAuthenticatedAgent } from "./helpers/auth.helper";

describe("Friend Integration Tests", () => {
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
	 * ヘルパー: 2ユーザーをセットアップし、各agentとユーザー情報を返す。
	 */
	async function setupTwoUsers() {
		const agent1 = await createAuthenticatedAgent(
			getApp(),
			"alice",
			"password1",
		);
		const agent2 = await createAuthenticatedAgent(getApp(), "bob", "password2");
		const me1 = await agent1.get("/auth/me");
		const me2 = await agent2.get("/auth/me");
		return {
			agent1,
			agent2,
			user1: me1.body,
			user2: me2.body,
		};
	}

	describe("POST /friends/request", () => {
		it("ユーザー名でフレンドリクエスト送信", async () => {
			const { agent1 } = await setupTwoUsers();

			const res = await agent1
				.post("/friends/request")
				.send({ username: "bob" });

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.friendRequest).toBeDefined();
			expect(res.body.friendRequest.status).toBe("pending");
		});

		it("receiverIdでフレンドリクエスト送信", async () => {
			const { agent1, user2 } = await setupTwoUsers();

			const res = await agent1
				.post("/friends/request")
				.send({ receiverId: user2.id });

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
		});

		it("自己リクエスト拒否 → success: false", async () => {
			const { agent1 } = await setupTwoUsers();

			const res = await agent1
				.post("/friends/request")
				.send({ username: "alice" });

			// try-catchで200 { success: false }を返す
			expect(res.body.success).toBe(false);
		});

		it("重複リクエスト拒否 → success: false", async () => {
			const { agent1 } = await setupTwoUsers();

			await agent1.post("/friends/request").send({ username: "bob" });
			const res = await agent1
				.post("/friends/request")
				.send({ username: "bob" });

			expect(res.body.success).toBe(false);
		});

		it("未ログイン拒否 → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/friends/request")
				.send({ username: "bob" });
			expect(res.status).toBe(401);
		});
	});

	describe("POST /friends/accept/:requestId", () => {
		it("リクエスト承認 → 双方向Friendレコード作成", async () => {
			const { agent1, agent2 } = await setupTwoUsers();

			// リクエスト送信
			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			const requestId = reqRes.body.friendRequest.id;

			// 受信者が承認
			const acceptRes = await agent2.post(`/friends/accept/${requestId}`);
			expect(acceptRes.status).toBe(201);
			expect(acceptRes.body.success).toBe(true);

			// 双方のフレンドリストに反映されている
			const friends1 = await agent1.get("/friends");
			const friends2 = await agent2.get("/friends");
			expect(friends1.body.friends.length).toBe(1);
			expect(friends2.body.friends.length).toBe(1);
		});

		it("送信者が承認しようとしても拒否 → success: false", async () => {
			const { agent1 } = await setupTwoUsers();

			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			const requestId = reqRes.body.friendRequest.id;

			// 送信者本人が承認 → 権限エラー（try-catchで200 { success: false }）
			const res = await agent1.post(`/friends/accept/${requestId}`);
			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /friends/reject/:requestId", () => {
		it("リクエスト拒否", async () => {
			const { agent1, agent2 } = await setupTwoUsers();

			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			const requestId = reqRes.body.friendRequest.id;

			const res = await agent2.post(`/friends/reject/${requestId}`);
			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);

			// フレンドにはなっていない
			const friends1 = await agent1.get("/friends");
			expect(friends1.body.friends.length).toBe(0);
		});

		it("送信者が拒否しようとしても拒否 → success: false", async () => {
			const { agent1 } = await setupTwoUsers();

			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			const requestId = reqRes.body.friendRequest.id;

			const res = await agent1.post(`/friends/reject/${requestId}`);
			expect(res.body.success).toBe(false);
		});
	});

	describe("GET /friends", () => {
		it("フレンドリスト取得（プロフィール情報含む）", async () => {
			const { agent1, agent2 } = await setupTwoUsers();

			// フレンドになる
			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			await agent2.post(`/friends/accept/${reqRes.body.friendRequest.id}`);

			const res = await agent1.get("/friends");
			expect(res.status).toBe(200);
			expect(res.body.friends).toHaveLength(1);
			expect(res.body.friends[0].friend).toBeDefined();
		});
	});

	describe("GET /friends/status/:userId", () => {
		it("フレンド状態確認 — フレンドの場合", async () => {
			const { agent1, agent2, user2 } = await setupTwoUsers();

			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			await agent2.post(`/friends/accept/${reqRes.body.friendRequest.id}`);

			const res = await agent1.get(`/friends/status/${user2.id}`);
			expect(res.status).toBe(200);
			expect(res.body.isFriend).toBe(true);
		});

		it("フレンド状態確認 — pending", async () => {
			const { agent1, user2 } = await setupTwoUsers();

			await agent1.post("/friends/request").send({ username: "bob" });

			const res = await agent1.get(`/friends/status/${user2.id}`);
			expect(res.status).toBe(200);
			expect(res.body.isFriend).toBe(false);
			expect(res.body.requestStatus).toBe("pending");
		});
	});

	describe("DELETE /friends/:friendId", () => {
		it("フレンド削除 → 双方向削除確認", async () => {
			const { agent1, agent2, user2 } = await setupTwoUsers();

			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			await agent2.post(`/friends/accept/${reqRes.body.friendRequest.id}`);

			// agent1がbobを削除
			const res = await agent1.delete(`/friends/${user2.id}`);
			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);

			// 双方のフレンドリストが空
			const friends1 = await agent1.get("/friends");
			const friends2 = await agent2.get("/friends");
			expect(friends1.body.friends.length).toBe(0);
			expect(friends2.body.friends.length).toBe(0);
		});
	});

	describe("完全ライフサイクル", () => {
		it("送信→承認→リスト確認→削除→再送信", async () => {
			const { agent1, agent2, user2 } = await setupTwoUsers();

			// 1. リクエスト送信
			const reqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			expect(reqRes.status).toBe(201);

			// 2. 承認
			await agent2.post(`/friends/accept/${reqRes.body.friendRequest.id}`);

			// 3. リスト確認
			const listRes = await agent1.get("/friends");
			expect(listRes.body.friends).toHaveLength(1);

			// 4. 削除
			await agent1.delete(`/friends/${user2.id}`);
			const emptyList = await agent1.get("/friends");
			expect(emptyList.body.friends).toHaveLength(0);

			// 5. 再送信可能
			const reReqRes = await agent1
				.post("/friends/request")
				.send({ username: "bob" });
			expect(reReqRes.status).toBe(201);
		});
	});
});
