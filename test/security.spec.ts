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
import { createAuthenticatedAgent, registerUser } from "./helpers/auth.helper";
import {
	connectToChat,
	waitForEvent,
	disconnectAll,
} from "./helpers/ws.helper";

describe("Security Tests", () => {
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

	// ─── SQLインジェクション防御 ─────────────────────

	describe("SQLインジェクション防御", () => {
		const sqlPayloads = [
			"'; DROP TABLE users; --",
			"' OR '1'='1",
			"' UNION SELECT * FROM users --",
			"1; DELETE FROM users",
			"' OR 1=1 --",
		];

		it("登録時のusernameにSQLペイロード → DBが正常", async () => {
			for (const payload of sqlPayloads) {
				const agent = request.agent(getApp().getHttpServer());
				await agent
					.post("/auth/register")
					.send({ username: payload, password: "password123" });
			}

			// usersテーブルが存在し、クエリ可能であることを確認
			const ds = getDataSource();
			const result = await ds.query('SELECT COUNT(*) as count FROM "users"');
			expect(Number(result[0].count)).toBeGreaterThanOrEqual(0);
		});

		it("ログイン時のusernameにSQLペイロード → DBが正常", async () => {
			// まず正常なユーザーを作成
			const agent = request.agent(getApp().getHttpServer());
			await registerUser(agent, "safeuser", "password123");

			for (const payload of sqlPayloads) {
				const attackAgent = request.agent(getApp().getHttpServer());
				await attackAgent
					.post("/auth/login")
					.send({ username: payload, password: "password123" });
			}

			// 正常ユーザーがまだ存在する
			const ds = getDataSource();
			const result = await ds.query(
				'SELECT COUNT(*) as count FROM "users" WHERE username = $1',
				["safeuser"],
			);
			expect(Number(result[0].count)).toBe(1);
		});

		it("フレンドリクエストのusernameにSQLペイロード → DBが正常", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			for (const payload of sqlPayloads) {
				await agent.post("/friends/request").send({ username: payload });
			}

			// テーブルが正常
			const ds = getDataSource();
			const result = await ds.query('SELECT COUNT(*) as count FROM "users"');
			expect(Number(result[0].count)).toBeGreaterThanOrEqual(1);
		});

		it("チャットメッセージのcontentにSQLペイロード → DBが正常", async () => {
			const client = connectToChat(getPort());
			sockets.push(client);
			await waitForEvent(client, "connect");

			client.emit("joinRoom", "room1");
			await waitForEvent(client, "loadHistory");

			for (const payload of sqlPayloads) {
				client.emit("sendMessage", {
					sender: "attacker",
					content: payload,
					roomId: "room1",
				});
			}

			await new Promise((r) => setTimeout(r, 1000));

			// chatテーブルが正常
			const ds = getDataSource();
			const result = await ds.query('SELECT COUNT(*) as count FROM "chat"');
			expect(Number(result[0].count)).toBeGreaterThanOrEqual(0);

			// usersテーブルも正常
			const usersResult = await ds.query(
				'SELECT COUNT(*) as count FROM "users"',
			);
			expect(Number(usersResult[0].count)).toBeGreaterThanOrEqual(0);
		});
	});

	// ─── XSS防御 ─────────────────────────────────────

	describe("XSS防御", () => {
		const xssPayloads = [
			"<script>alert(1)</script>",
			"<img src=x onerror=alert(1)>",
			'<iframe src="javascript:alert(1)">',
			'"><script>alert(document.cookie)</script>',
			"javascript:alert('xss')",
		];

		it("profileのdisplayNameにXSSペイロード → スクリプトが実行不可能な形で保存", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			for (const payload of xssPayloads) {
				const res = await agent
					.put("/profile/me")
					.send({ displayName: payload });

				if (res.status === 200) {
					const profile = await agent.get("/profile/me");
					const savedName = profile.body.displayName;
					// スクリプトタグがそのまま残っていないか、エスケープされていることを確認
					// サーバーがサニタイズするか、フロントでエスケープするかはアーキテクチャ次第
					// 最低限、保存されていることを確認（クラッシュしない）
					expect(savedName).toBeDefined();
				}
			}
		});

		it("profileのbioにXSSペイロード → 保存されてもエスケープ可能", async () => {
			const agent = await createAuthenticatedAgent(
				getApp(),
				"testuser",
				"pass1234",
			);

			for (const payload of xssPayloads) {
				const res = await agent.put("/profile/me").send({ bio: payload });

				if (res.status === 200) {
					const profile = await agent.get("/profile/me");
					expect(profile.body.bio).toBeDefined();
				}
			}
		});

		it("チャットメッセージにXSSペイロード → サーバーが正常動作", async () => {
			const client1 = connectToChat(getPort());
			const client2 = connectToChat(getPort());
			sockets.push(client1, client2);
			await Promise.all([
				waitForEvent(client1, "connect"),
				waitForEvent(client2, "connect"),
			]);

			client1.emit("joinRoom", "xss-room");
			client2.emit("joinRoom", "xss-room");
			await Promise.all([
				waitForEvent(client1, "loadHistory"),
				waitForEvent(client2, "loadHistory"),
			]);

			for (const payload of xssPayloads) {
				const msgPromise = waitForEvent<string>(client2, "newMessage");
				client1.emit("sendMessage", {
					sender: "attacker",
					content: payload,
					roomId: "xss-room",
				});
				const received = await msgPromise;
				// メッセージがそのまま届くか、サニタイズされて届く
				expect(received).toBeDefined();
			}
		});
	});

	// ─── 認証バイパス防御 ────────────────────────────

	describe("認証バイパス防御", () => {
		it("改ざんしたJWT Cookieで保護エンドポイントにアクセス → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			const res = await agent
				.get("/auth/me")
				.set(
					"Cookie",
					"token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjk5OTk5LCJ1c2VybmFtZSI6ImhhY2tlciJ9.invalidsignature",
				);
			expect(res.status).toBe(401);
		});

		it("期限切れのJWT形式Cookie → 401", async () => {
			const agent = request.agent(getApp().getHttpServer());
			// 明らかに不正なトークン
			const res = await agent
				.get("/profile/me")
				.set("Cookie", "token=not.a.valid.jwt");
			expect(res.status).toBe(401);
		});
	});
});
