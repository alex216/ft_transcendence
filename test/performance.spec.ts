import * as request from "supertest";
import { Socket } from "socket.io-client";
import {
	setupTestApp,
	teardownTestApp,
	getApp,
	getPort,
	getDataSource,
} from "./setup";
import { clearDatabase, waitForRows } from "./helpers/db.helper";
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

describe("Performance Tests", () => {
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

	it("ログイン応答時間 < 200ms", async () => {
		const agent = request.agent(getApp().getHttpServer());
		await registerUser(agent, "perfuser", "perfpass1");

		const start = Date.now();
		await loginUser(agent, "perfuser", "perfpass1");
		const elapsed = Date.now() - start;

		expect(elapsed).toBeLessThan(200);
	});

	it("フレンドリスト取得（10件）< 500ms", async () => {
		// メインユーザー
		const mainAgent = await createAuthenticatedAgent(
			getApp(),
			"mainuser",
			"password",
		);

		// 10人のフレンドを作成
		for (let i = 0; i < 10; i++) {
			const friendAgent = await createAuthenticatedAgent(
				getApp(),
				`friend${i}`,
				"password",
			);

			const reqRes = await mainAgent
				.post("/friends/request")
				.send({ username: `friend${i}` });

			await friendAgent.post(`/friends/accept/${reqRes.body.friendRequest.id}`);
		}

		const start = Date.now();
		const res = await mainAgent.get("/friends");
		const elapsed = Date.now() - start;

		expect(res.body.friends).toHaveLength(10);
		expect(elapsed).toBeLessThan(500);
	});

	it("20同時ログイン → 5秒以内に全完了", async () => {
		// 20ユーザーを登録
		for (let i = 0; i < 20; i++) {
			const a = request.agent(getApp().getHttpServer());
			await registerUser(a, `user${i}`, `password${i}`);
		}

		const start = Date.now();
		const agents = Array.from({ length: 20 }, () =>
			request.agent(getApp().getHttpServer()),
		);

		await Promise.all(
			agents.map((agent, i) => loginUser(agent, `user${i}`, `password${i}`)),
		);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeLessThan(5000);
	});

	it("ゲームupdateState → 1秒間に50+イベント", async () => {
		// 認証済みプレイヤーを作成
		const agent1 = request.agent(getApp().getHttpServer());
		await registerUser(agent1, "perfgamer1", "perfpass1");
		const login1 = await loginUser(agent1, "perfgamer1", "perfpass1");
		const cookie1 = extractCookies(login1);

		const agent2 = request.agent(getApp().getHttpServer());
		await registerUser(agent2, "perfgamer2", "perfpass2");
		const login2 = await loginUser(agent2, "perfgamer2", "perfpass2");
		const cookie2 = extractCookies(login2);

		const p1 = connectToGame(getPort(), cookie1);
		const p2 = connectToGame(getPort(), cookie2);
		sockets.push(p1, p2);
		await Promise.all([
			waitForEvent(p1, "connect"),
			waitForEvent(p2, "connect"),
		]);

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		// ゲーム開始を待つ
		await waitForEvent(p1, "updateState");

		// 1秒間にupdateStateイベントをカウント
		let count = 0;
		p1.on("updateState", () => {
			count++;
		});

		await new Promise((r) => setTimeout(r, 1100));
		p1.off("updateState");

		expect(count).toBeGreaterThanOrEqual(50);
	});

	it("100チャットメッセージ → loadHistoryが1秒以内", async () => {
		const sender = connectToChat(getPort());
		sockets.push(sender);
		await waitForEvent(sender, "connect");

		sender.emit("joinRoom", "perfroom");
		await waitForEvent(sender, "loadHistory");

		// 100メッセージを送信
		for (let i = 0; i < 100; i++) {
			sender.emit("sendMessage", {
				sender: "perfuser",
				content: `Message ${i}`,
				roomId: "perfroom",
			});
		}

		// DBに100メッセージが保存されるまでポーリングで待機
		await waitForRows(getDataSource(), "chat", 100);

		// 新しいクライアントが参加してloadHistoryの時間を計測
		const reader = connectToChat(getPort());
		sockets.push(reader);
		await waitForEvent(reader, "connect");

		const start = Date.now();
		reader.emit("joinRoom", "perfroom");
		const history = await waitForEvent<unknown[]>(reader, "loadHistory");
		const elapsed = Date.now() - start;

		expect(history.length).toBeGreaterThanOrEqual(100);
		expect(elapsed).toBeLessThan(1000);
	});
});
