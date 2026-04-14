import * as request from "supertest";
import { Socket } from "socket.io-client";
import {
	setupTestApp,
	teardownTestApp,
	getApp,
	getPort,
	getDataSource,
} from "./setup";
import { clearDatabase } from "./helpers/db.helper";
import { createAuthenticatedAgent } from "./helpers/auth.helper";
import {
	connectToChat,
	connectToGame,
	waitForEvent,
	disconnectAll,
} from "./helpers/ws.helper";

describe("Error Handling Tests", () => {
	let sockets: Socket[] = [];

	beforeAll(async () => {
		await setupTestApp();
	});

	afterAll(async () => {
		await teardownTestApp();
	});

	beforeEach(async () => {
		await clearDatabase(getDataSource());
	});

	afterEach(() => {
		disconnectAll(sockets);
		sockets = [];
	});

	describe("全保護エンドポイントの401テスト", () => {
		const protectedEndpoints = [
			{ method: "get" as const, path: "/auth/me" },
			{ method: "get" as const, path: "/profile/me" },
			{ method: "put" as const, path: "/profile/me" },
			{ method: "post" as const, path: "/profile/avatar" },
			{ method: "delete" as const, path: "/profile/avatar" },
			{ method: "get" as const, path: "/friends" },
			{ method: "get" as const, path: "/friends/requests" },
			{ method: "post" as const, path: "/friends/request" },
			{ method: "post" as const, path: "/friends/accept/1" },
			{ method: "post" as const, path: "/friends/reject/1" },
			{ method: "delete" as const, path: "/friends/1" },
			{ method: "get" as const, path: "/friends/status/1" },
		];

		it.each(protectedEndpoints)(
			"$method $path → 401",
			async ({ method, path }) => {
				const agent = request.agent(getApp().getHttpServer());
				const res = await agent[method](path);
				expect(res.status).toBe(401);
			},
		);
	});

	describe("バリデーションエラー", () => {
		it("無効なIDフォーマット /profile/abc → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password",
			);
			const res = await agent.get("/profile/abc");
			// コントローラは200で{ success: false }を返す
			expect(res.body.success).toBe(false);
		});

		it("無効なfriend requestId /friends/accept/abc → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password",
			);
			const res = await agent.post("/friends/accept/abc");
			expect(res.body.success).toBe(false);
		});

		it("無効なfriend userId /friends/status/abc → isFriend: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password",
			);
			const res = await agent.get("/friends/status/abc");
			// NaN IDの場合、{ isFriend: false }を返す
			expect(res.body.isFriend).toBe(false);
		});
	});

	describe("存在しないリソース", () => {
		it("存在しないユーザーへのフレンドリクエスト → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password",
			);
			const res = await agent
				.post("/friends/request")
				.send({ username: "nonexistent" });
			// try-catchで200 { success: false }を返す
			expect(res.body.success).toBe(false);
		});

		it("存在しないリクエストIDで承認 → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"password",
			);
			const res = await agent.post("/friends/accept/99999");
			expect(res.body.success).toBe(false);
		});
	});

	describe("コンフリクト", () => {
		it("重複ユーザー登録 → success: false", async () => {
			const agent1 = request.agent(getApp().getHttpServer());
			const agent2 = request.agent(getApp().getHttpServer());

			await agent1
				.post("/auth/register")
				.send({ username: "dup", password: "password" });

			const res = await agent2
				.post("/auth/register")
				.send({ username: "dup", password: "password" });
			expect(res.body.success).toBe(false);
		});

		it("重複フレンドリクエスト → success: false", async () => {
			const agent1 = await createAuthenticatedAgent(
				getApp(),
				"user1",
				"password1",
			);
			await createAuthenticatedAgent(getApp(), "user2", "password2");

			await agent1.post("/friends/request").send({ username: "user2" });

			const res = await agent1
				.post("/friends/request")
				.send({ username: "user2" });
			// try-catchで200 { success: false }を返す
			expect(res.body.success).toBe(false);
		});
	});

	describe("WebSocketエラー耐性", () => {
		it("不正データ送信でサーバーがクラッシュしない", async () => {
			const client = connectToChat(getPort());
			sockets.push(client);
			await waitForEvent(client, "connect");

			// 不正なペイロードを送信
			client.emit("sendMessage", null);
			client.emit("sendMessage", "not-an-object");
			client.emit("sendMessage", { invalid: true });
			client.emit("joinRoom", null);

			// サーバーがまだ応答するか確認
			await new Promise((r) => setTimeout(r, 500));

			const client2 = connectToChat(getPort());
			sockets.push(client2);
			await waitForEvent(client2, "connect");
			expect(client2.connected).toBe(true);
		});

		it("ゲーム不正データでクラッシュしない", async () => {
			// GameGatewayはJWT認証が必要 → cookieなしでは即切断される
			// ここではサーバーがクラッシュしないことを確認
			const client = connectToGame(getPort());
			sockets.push(client);

			// 認証なしで接続 → 切断されるが、サーバーはクラッシュしない
			await new Promise((r) => setTimeout(r, 500));

			// チャットゲートウェイで不正データテスト（認証不要）
			const chatClient = connectToChat(getPort());
			sockets.push(chatClient);
			await waitForEvent(chatClient, "connect");

			chatClient.emit("sendMessage", null);
			chatClient.emit("sendMessage", { invalid: true });

			await new Promise((r) => setTimeout(r, 500));

			// サーバーがまだ稼働
			const chatClient2 = connectToChat(getPort());
			sockets.push(chatClient2);
			await waitForEvent(chatClient2, "connect");
			expect(chatClient2.connected).toBe(true);
		});
	});
});
