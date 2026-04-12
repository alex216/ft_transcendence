import { Socket } from "socket.io-client";
import { setupTestApp, teardownTestApp, getPort, getDataSource } from "./setup";
import { clearDatabase, waitForRows } from "./helpers/db.helper";
import {
	connectToChat,
	waitForEvent,
	disconnectAll,
} from "./helpers/ws.helper";

describe("Chat Integration Tests", () => {
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

	function createClient(): Socket {
		const s = connectToChat(getPort());
		sockets.push(s);
		return s;
	}

	it("/chat接続成功", async () => {
		const client = createClient();
		await waitForEvent(client, "connect");
		expect(client.connected).toBe(true);
	});

	it("ルーム参加 → loadHistory受信", async () => {
		const client = createClient();
		await waitForEvent(client, "connect");

		client.emit("joinRoom", "room1");
		const history = await waitForEvent<unknown[]>(client, "loadHistory");

		expect(Array.isArray(history)).toBe(true);
		expect(history.length).toBe(0); // 初回は空
	});

	it("メッセージ送信 → 他クライアントがnewMessage受信", async () => {
		const client1 = createClient();
		const client2 = createClient();
		await Promise.all([
			waitForEvent(client1, "connect"),
			waitForEvent(client2, "connect"),
		]);

		// 両方がroom1に参加
		client1.emit("joinRoom", "room1");
		client2.emit("joinRoom", "room1");
		await Promise.all([
			waitForEvent(client1, "loadHistory"),
			waitForEvent(client2, "loadHistory"),
		]);

		// client1がメッセージ送信 → client2が受信
		const messagePromise = waitForEvent<string>(client2, "newMessage");
		client1.emit("sendMessage", {
			sender: "client1",
			content: "Hello!",
			roomId: "room1",
		});

		const receivedContent = await messagePromise;
		expect(receivedContent).toBe("Hello!");
	});

	it("送信者は自分のnewMessageを受信しない", async () => {
		const client1 = createClient();
		const client2 = createClient();
		await Promise.all([
			waitForEvent(client1, "connect"),
			waitForEvent(client2, "connect"),
		]);

		client1.emit("joinRoom", "room1");
		client2.emit("joinRoom", "room1");
		await Promise.all([
			waitForEvent(client1, "loadHistory"),
			waitForEvent(client2, "loadHistory"),
		]);

		let senderReceived = false;
		client1.on("newMessage", () => {
			senderReceived = true;
		});

		client1.emit("sendMessage", {
			sender: "client1",
			content: "test",
			roomId: "room1",
		});

		// client2は受信するはず
		await waitForEvent(client2, "newMessage");

		// 少し待って、送信者が受信していないことを確認
		await new Promise((r) => setTimeout(r, 200));
		expect(senderReceived).toBe(false);
	});

	it("メッセージ永続化 — 再joinでloadHistoryに含まれる", async () => {
		const client1 = createClient();
		await waitForEvent(client1, "connect");

		// room1に参加してメッセージ送信
		client1.emit("joinRoom", "room1");
		await waitForEvent(client1, "loadHistory");

		client1.emit("sendMessage", {
			sender: "client1",
			content: "Persistent message",
			roomId: "room1",
		});

		// DBにメッセージが保存されるまでポーリングで待機
		await waitForRows(getDataSource(), "chat", 1);

		// 新しいクライアントがjoinしてloadHistoryを確認
		const client2 = createClient();
		await waitForEvent(client2, "connect");

		client2.emit("joinRoom", "room1");
		const history = await waitForEvent<unknown[]>(client2, "loadHistory");

		expect(history.length).toBeGreaterThanOrEqual(1);
	});

	it("ルーム分離 — room1のメッセージがroom2に漏れない", async () => {
		const client1 = createClient();
		const client2 = createClient();
		await Promise.all([
			waitForEvent(client1, "connect"),
			waitForEvent(client2, "connect"),
		]);

		// 別々のルームに参加
		client1.emit("joinRoom", "room1");
		client2.emit("joinRoom", "room2");
		await Promise.all([
			waitForEvent(client1, "loadHistory"),
			waitForEvent(client2, "loadHistory"),
		]);

		let room2Received = false;
		client2.on("newMessage", () => {
			room2Received = true;
		});

		// room1にメッセージ送信
		client1.emit("sendMessage", {
			sender: "client1",
			content: "room1 only",
			roomId: "room1",
		});

		await new Promise((r) => setTimeout(r, 300));
		expect(room2Received).toBe(false);
	});

	it("複数クライアント同時 — 3クライアントで正常動作", async () => {
		const clients = [createClient(), createClient(), createClient()];
		await Promise.all(clients.map((c) => waitForEvent(c, "connect")));

		// 全員がroom1に参加
		for (const c of clients) {
			c.emit("joinRoom", "room1");
		}
		await Promise.all(clients.map((c) => waitForEvent(c, "loadHistory")));

		// client[0]がメッセージ送信 → client[1]とclient[2]が受信
		const promises = [
			waitForEvent(clients[1], "newMessage"),
			waitForEvent(clients[2], "newMessage"),
		];

		clients[0].emit("sendMessage", {
			sender: "c0",
			content: "broadcast test",
			roomId: "room1",
		});

		const results = await Promise.all(promises);
		expect(results[0]).toBe("broadcast test");
		expect(results[1]).toBe("broadcast test");
	});
});
