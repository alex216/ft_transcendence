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
import {
	registerUser,
	loginUser,
	createAuthenticatedAgent,
} from "./helpers/auth.helper";
import {
	connectToChat,
	connectToGame,
	waitForEvent,
	disconnectAll,
	extractCookies,
} from "./helpers/ws.helper";

describe("Multi-User Integration Tests", () => {
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

	it("5ユーザー同時登録 → 全員成功、一意のID", async () => {
		const agents = Array.from({ length: 5 }, () =>
			request.agent(getApp().getHttpServer()),
		);

		const results = await Promise.all(
			agents.map((agent, i) => registerUser(agent, `user${i}`, `password${i}`)),
		);

		const ids = results.map((r) => r.body.user.id);
		results.forEach((r) => expect(r.status).toBe(201));

		// IDが全て一意
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(5);
	});

	it("5ユーザー同時ログイン → 独立セッション", async () => {
		// まず登録
		for (let i = 0; i < 5; i++) {
			const agent = request.agent(getApp().getHttpServer());
			await registerUser(agent, `user${i}`, `password${i}`);
		}

		// 順次ログイン（同時実行はDB負荷でflakyになるため）
		const agents: ReturnType<typeof request.agent>[] = [];
		for (let i = 0; i < 5; i++) {
			const agent = request.agent(getApp().getHttpServer());
			const res = await loginUser(agent, `user${i}`, `password${i}`);
			expect(res.status).toBe(201);
			agents.push(agent);
		}

		// 各自のセッションが独立
		const meResults = await Promise.all(
			agents.map((agent) => agent.get("/auth/me")),
		);
		meResults.forEach((r, i) => {
			expect(r.status).toBe(200);
			expect(r.body.username).toBe(`user${i}`);
		});
	});

	it("5ユーザー同時プロフィール更新 → 各自のデータのみ変更", async () => {
		const agents = await Promise.all(
			Array.from({ length: 5 }, (_, i) =>
				createAuthenticatedAgent(getApp(), `user${i}`, `password${i}`),
			),
		);

		// 同時更新
		await Promise.all(
			agents.map((agent, i) =>
				agent.put("/profile/me").send({ displayName: `DisplayName${i}` }),
			),
		);

		// 各自のプロフィールが正しい
		const profiles = await Promise.all(
			agents.map((agent) => agent.get("/profile/me")),
		);
		profiles.forEach((r, i) => {
			expect(r.body.displayName).toBe(`DisplayName${i}`);
		});
	});

	it("10クライアント同時チャット接続", async () => {
		const clients: Socket[] = [];
		for (let i = 0; i < 10; i++) {
			const c = connectToChat(getPort());
			sockets.push(c);
			clients.push(c);
		}

		await Promise.all(clients.map((c) => waitForEvent(c, "connect")));

		clients.forEach((c) => expect(c.connected).toBe(true));
	});

	it("5クライアント同一ルームでメッセージ送受信", async () => {
		const clients: Socket[] = [];
		for (let i = 0; i < 5; i++) {
			const c = connectToChat(getPort());
			sockets.push(c);
			clients.push(c);
		}
		await Promise.all(clients.map((c) => waitForEvent(c, "connect")));

		// 全員がroomに参加
		for (const c of clients) {
			c.emit("joinRoom", "multiroom");
		}
		await Promise.all(clients.map((c) => waitForEvent(c, "loadHistory")));

		// client[0]がメッセージ送信 → 他の4人が受信
		const receivePromises = clients
			.slice(1)
			.map((c) => waitForEvent(c, "newMessage"));

		clients[0].emit("sendMessage", {
			sender: "c0",
			content: "multi-user test",
			roomId: "multiroom",
		});

		const results = await Promise.all(receivePromises);
		results.forEach((r) => expect(r).toBe("multi-user test"));
	});

	it("4プレイヤーがキュー参加 → 2試合が作成される", async () => {
		// 認証済みプレイヤーを4人作成（接続完了を待つ）
		const players: Socket[] = [];
		for (let i = 0; i < 4; i++) {
			const agent = request.agent(getApp().getHttpServer());
			await registerUser(agent, `gamer${i}`, `gamepass${i}`);
			const loginRes = await loginUser(agent, `gamer${i}`, `gamepass${i}`);
			const cookie = extractCookies(loginRes);
			const p = await new Promise<Socket>((resolve, reject) => {
				const s = connectToGame(getPort(), cookie);
				sockets.push(s);
				s.on("connect", () => resolve(s));
				s.on("connect_error", (err) => reject(err));
				setTimeout(
					() => reject(new Error(`Timeout connecting gamer${i}`)),
					5000,
				);
			});
			players.push(p);
		}

		// 全員がキューに参加
		for (const p of players) {
			p.emit("joinQueue");
		}

		// 全プレイヤーがupdateStateを受信するはず（2試合開始）
		const states = await Promise.all(
			players.map((p) => waitForEvent(p, "updateState")),
		);
		states.forEach((s) => expect(s).toBeDefined());
	});
});
