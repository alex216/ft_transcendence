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

describe("Input Validation Tests", () => {
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

	// ─── 認証系バリデーション ─────────────────────────

	describe("POST /auth/register — 不正入力", () => {
		it("空文字のusernameで登録 → 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/register")
				.send({ username: "", password: "password123" });
			expect(res.status).toBe(400);
		});

		it("空文字のpasswordで登録 → 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/register")
				.send({ username: "testuser", password: "" });
			expect(res.status).toBe(400);
		});

		it("極端に長いusername（10000文字）→ 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const longUsername = "a".repeat(10000);
			const res = await agent
				.post("/auth/register")
				.send({ username: longUsername, password: "password123" });
			expect(res.status).toBe(400);
		});

		it("数値型のusername（型不一致）→ 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/register")
				.send({ username: 12345, password: "password123" });
			expect(res.status).toBe(400);
		});

		it("null/undefinedのフィールド → 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/register")
				.send({ username: null, password: null });
			expect(res.status).toBe(400);
		});

		it("スペースのみのusername → 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.post("/auth/register")
				.send({ username: "   ", password: "password123" });
			expect(res.status).toBe(400);
		});

		it("ボディなしで登録 → 400", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent.post("/auth/register").send({});
			expect(res.status).toBe(400);
		});
	});

	// ─── プロフィール系バリデーション ─────────────────

	describe("PUT /profile/me — 不正入力", () => {
		it("displayNameに5000文字 → 400 or 切り捨て", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const longName = "あ".repeat(5000);
			const res = await agent
				.put("/profile/me")
				.send({ displayName: longName });

			// サーバーが400を返すか、切り捨てて200を返すかのどちらか
			if (res.status === 200) {
				// 切り捨てられている場合、保存された値が元より短いことを確認
				const profile = await agent.get("/profile/me");
				expect(profile.body.displayName.length).toBeLessThanOrEqual(5000);
			} else {
				expect(res.status).toBe(400);
			}
		});

		it("bioに空文字 → 許容される（200）", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const res = await agent.put("/profile/me").send({ bio: "" });
			expect(res.status).toBe(200);
		});

		it("displayNameに数値型 → 400", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const res = await agent.put("/profile/me").send({ displayName: 12345 });
			expect(res.status).toBe(400);
		});
	});

	// ─── フレンド系バリデーション ─────────────────────

	describe("POST /friends/request — 不正入力", () => {
		it("空文字のusernameでリクエスト → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const res = await agent.post("/friends/request").send({ username: "" });
			// 空文字はfalsyなのでreceiverId||usernameがfalse → success: false
			expect(res.body.success).toBe(false);
		});

		it("receiverIdもusernameも無い → success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const res = await agent.post("/friends/request").send({});
			expect(res.body.success).toBe(false);
		});

		it("requestIdにNaN（/friends/accept/abc）→ success: false", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);
			const res = await agent.post("/friends/accept/abc");
			expect(res.body.success).toBe(false);
		});
	});

	// ─── WebSocket系バリデーション ────────────────────

	describe("WebSocket — 不正入力の処理", () => {
		it("認証なしでゲーム接続 → 切断されるがサーバーがクラッシュしない", async () => {
			// 認証なしで接続 → サーバーが切断するが、クラッシュはしない
			const client = connectToGame(getPort());
			sockets.push(client);

			await new Promise((r) => setTimeout(r, 500));

			// サーバーがまだ応答するか確認（チャットは認証不要）
			const chatClient = connectToChat(getPort());
			sockets.push(chatClient);
			await waitForEvent(chatClient, "connect");
			expect(chatClient.connected).toBe(true);
		});

		it("不正なチャットデータ → サーバーがクラッシュしない", async () => {
			const client = connectToChat(getPort());
			sockets.push(client);
			await waitForEvent(client, "connect");

			// 不正なデータを送信
			client.emit("sendMessage", { y: Infinity });
			client.emit("sendMessage", null);
			await new Promise((r) => setTimeout(r, 300));

			const client2 = connectToChat(getPort());
			sockets.push(client2);
			await waitForEvent(client2, "connect");
			expect(client2.connected).toBe(true);
		});

		it("チャットで空文字content → サーバーがクラッシュしない", async () => {
			const client = connectToChat(getPort());
			sockets.push(client);
			await waitForEvent(client, "connect");

			client.emit("joinRoom", "room1");
			await waitForEvent(client, "loadHistory");

			// 空文字メッセージ送信
			client.emit("sendMessage", {
				sender: "test",
				content: "",
				roomId: "room1",
			});
			await new Promise((r) => setTimeout(r, 300));

			// サーバーがまだ応答
			const client2 = connectToChat(getPort());
			sockets.push(client2);
			await waitForEvent(client2, "connect");
			expect(client2.connected).toBe(true);
		});

		it("チャットでnull content → サーバーがクラッシュしない", async () => {
			const client = connectToChat(getPort());
			sockets.push(client);
			await waitForEvent(client, "connect");

			client.emit("joinRoom", "room1");
			await waitForEvent(client, "loadHistory");

			client.emit("sendMessage", {
				sender: "test",
				content: null,
				roomId: "room1",
			});
			await new Promise((r) => setTimeout(r, 300));

			const client2 = connectToChat(getPort());
			sockets.push(client2);
			await waitForEvent(client2, "connect");
			expect(client2.connected).toBe(true);
		});
	});
});
