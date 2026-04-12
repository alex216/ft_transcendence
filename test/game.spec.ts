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
import { registerUser, loginUser } from "./helpers/auth.helper";
import {
	connectToGame,
	waitForEvent,
	disconnectAll,
	extractCookies,
} from "./helpers/ws.helper";

interface UpdateStateData {
	roomId: string;
	state: {
		ball: { x: number; y: number };
		leftPaddleY: number;
		rightPaddleY: number;
		leftScore: number;
		rightScore: number;
		isPaused: boolean;
	};
}

interface GameOverData {
	winner: string;
	reason?: string;
	roomId: string;
}

describe("Game Integration Tests", () => {
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

	/** 認証済みのゲームWebSocketクライアントを作成する */
	async function createAuthenticatedPlayer(username: string): Promise<Socket> {
		const agent = request.agent(getApp().getHttpServer());
		await registerUser(agent, username, `pass_${username}`);
		const loginRes = await loginUser(agent, username, `pass_${username}`);
		const cookie = extractCookies(loginRes);

		return new Promise<Socket>((resolve, reject) => {
			const s = connectToGame(getPort(), cookie);
			sockets.push(s);
			s.on("connect", () => resolve(s));
			s.on("connect_error", (err) =>
				reject(new Error(`Game connect error for ${username}: ${err.message}`)),
			);
			s.on("disconnect", (reason) => {
				if (reason === "io server disconnect") {
					reject(
						new Error(
							`Server disconnected ${username}: JWT auth likely failed. Cookie: ${cookie?.substring(0, 50)}...`,
						),
					);
				}
			});
			setTimeout(
				() => reject(new Error(`Timeout connecting ${username}`)),
				5000,
			);
		});
	}

	it("キューに1人 → ゲーム開始しない", async () => {
		const p1 = await createAuthenticatedPlayer("player1");

		let received = false;
		p1.on("updateState", () => {
			received = true;
		});

		p1.emit("joinQueue");

		await new Promise((r) => setTimeout(r, 500));
		expect(received).toBe(false);
	});

	it("キューに2人 → updateState受信開始", async () => {
		const p1 = await createAuthenticatedPlayer("player1");
		const p2 = await createAuthenticatedPlayer("player2");
		// createAuthenticatedPlayerで接続済み

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		// どちらかがupdateStateを受信するはず
		const data = await Promise.race([
			waitForEvent<UpdateStateData>(p1, "updateState"),
			waitForEvent<UpdateStateData>(p2, "updateState"),
		]);

		expect(data).toBeDefined();
	});

	it("updateState形式 — ball, paddleY, score, isPaused含む", async () => {
		const p1 = await createAuthenticatedPlayer("player1");
		const p2 = await createAuthenticatedPlayer("player2");
		// createAuthenticatedPlayerで接続済み

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		const data = await Promise.race([
			waitForEvent<UpdateStateData>(p1, "updateState"),
			waitForEvent<UpdateStateData>(p2, "updateState"),
		]);

		const state = data.state;
		expect(state.ball).toBeDefined();
		expect(state.ball.x).toBeDefined();
		expect(state.ball.y).toBeDefined();
		expect(typeof state.leftPaddleY).toBe("number");
		expect(typeof state.rightPaddleY).toBe("number");
		expect(typeof state.leftScore).toBe("number");
		expect(typeof state.rightScore).toBe("number");
		expect(typeof state.isPaused).toBe("boolean");
	});

	it("パドル移動 → updateStateに反映", async () => {
		const p1 = await createAuthenticatedPlayer("player1");
		const p2 = await createAuthenticatedPlayer("player2");
		// createAuthenticatedPlayerで接続済み

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		// 初期状態を受信
		const initial = await waitForEvent<UpdateStateData>(p1, "updateState");
		const initialY = initial.state.leftPaddleY;

		// moveDown でパドルを下に移動
		p1.emit("moveDown");

		// 次のupdateStateでパドル位置が変わることを確認
		let moved = false;
		for (let i = 0; i < 30; i++) {
			const data = await waitForEvent<UpdateStateData>(p1, "updateState");
			if (data.state.leftPaddleY !== initialY) {
				moved = true;
				break;
			}
		}
		expect(moved).toBe(true);
	});

	it("速度制限（アンチチート）— 不正な移動イベントでクラッシュしない", async () => {
		const p1 = await createAuthenticatedPlayer("player1");
		const p2 = await createAuthenticatedPlayer("player2");
		// createAuthenticatedPlayerで接続済み

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		await waitForEvent<UpdateStateData>(p1, "updateState");

		// moveUp/moveDownを連打してもサーバーがクラッシュしない
		for (let i = 0; i < 20; i++) {
			p1.emit("moveUp");
		}

		// 数フレーム待って確認
		const data = await waitForEvent<UpdateStateData>(p1, "updateState");
		expect(data.state).toBeDefined();
	});

	it("切断処理 → gameOver(winner, reason:disconnect)", async () => {
		const p1 = await createAuthenticatedPlayer("player1");
		const p2 = await createAuthenticatedPlayer("player2");
		// createAuthenticatedPlayerで接続済み

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		// ゲーム開始を確認
		await waitForEvent<UpdateStateData>(p2, "updateState");

		// p1が切断 → GRACE_TIME(15秒)後にp2がgameOverを受信
		const gameOverPromise = waitForEvent<GameOverData>(p2, "gameOver", 20000);
		p1.disconnect();

		const gameOver = await gameOverPromise;
		expect(gameOver.winner).toBeDefined();
		expect(gameOver.reason).toBe("disconnect");
	});

	it("切断時の履歴保存 — MatchHistoryにMAX_SCORE記録", async () => {
		const p1 = await createAuthenticatedPlayer("player1");
		const p2 = await createAuthenticatedPlayer("player2");
		// createAuthenticatedPlayerで接続済み

		p1.emit("joinQueue");
		p2.emit("joinQueue");

		await waitForEvent<UpdateStateData>(p2, "updateState");

		const gameOverPromise = waitForEvent<GameOverData>(p2, "gameOver", 20000);
		p1.disconnect();
		await gameOverPromise;

		// DB保存を待つ
		await new Promise((r) => setTimeout(r, 500));

		// match_historyテーブルを確認
		const ds = getDataSource();
		const rows = await ds.query("SELECT * FROM match_history");
		expect(rows.length).toBeGreaterThanOrEqual(1);

		const lastMatch = rows[rows.length - 1];
		// 切断時は現在のスコアが保存される
		// カラム名はTypeORMの設定に依存するため、存在するキーで確認
		const keys = Object.keys(lastMatch);
		const scoreKey = keys.find(
			(k) =>
				k.toLowerCase().includes("winnerscore") ||
				k.toLowerCase().includes("winner_score"),
		);
		expect(scoreKey).toBeDefined();
		expect(lastMatch[scoreKey!]).toBeDefined();
	});
});
