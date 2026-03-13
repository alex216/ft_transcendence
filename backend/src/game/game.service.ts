import { Injectable } from "@nestjs/common";
import { Socket, Server } from "socket.io";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MatchHistory } from "./match-history.entity";
import { GameState } from "../../../shared/game.interface";
import {
	FIELD_WIDTH,
	FIELD_HEIGHT,
	FIELD_CENTER,
	PAD_LENGTH,
	LEFTPAD_LEFTMOST,
	LEFTPAD_RIGHTMOST,
	RIGHTPAD_LEFTMOST,
	RIGHTPAD_RIGHTMOST,
	STARTING_POSITION,
	UPPER_LIMIT,
	SPEED_BASE,
	SPEED_CHANGE,
	MAX_SCORE,
	ANGLE_CHANGE,
	PAD_SPEED,
} from "../../../shared/game.constants";

// サーバー内部でのみ管理する物理パラメータ（フロントには送らない）
interface GameInternalState extends GameState {
	dx: number;
	dy: number;
	p1Id: string;
	p2Id: string;
	interval: NodeJS.Timeout | null;
}

@Injectable()
export class GameService {
	constructor(
		@InjectRepository(MatchHistory)
		private readonly matchHistoryRepository: Repository<MatchHistory>,
	) {}

	private games = new Map<string, GameInternalState>();
	private queue: Socket[] = [];

	// マッチメイキング
	addToQueue(client: Socket, server: Server) {
		console.log(`[Game] Player joined queue: ${client.id}`);

		if (this.queue.find((s) => s.id === client.id)) return;
		this.queue.push(client);
		console.log(
			"Queue:",
			this.queue.map((s) => s.id),
		);

		if (this.queue.length >= 2) {
			console.log(`[Game] Match found! Starting game...`);
			const p1 = this.queue.shift()!;
			const p2 = this.queue.shift()!;
			const roomId = `room_${p1.id}`;

			p1.join(roomId);
			p2.join(roomId);

			this.initGame(roomId, p1.id, p2.id, server);
		}
	}

	// ゲームの初期化
	initGame(roomId: string, p1Id: string, p2Id: string, server: Server) {
		const initialState: GameInternalState = {
			ball: { ...FIELD_CENTER },
			leftPaddleY: STARTING_POSITION,
			rightPaddleY: STARTING_POSITION,
			leftScore: 0,
			rightScore: 0,
			isPaused: false,
			dx: SPEED_BASE,
			dy: SPEED_BASE,
			p1Id,
			p2Id,
			interval: null,
		};

		const interval = setInterval(() => {
			this.gameLoop(roomId, server);
		}, 1000 / 60);

		initialState.interval = interval;

		this.games.set(roomId, initialState);
	}

	private gameLoop(roomId: string, server: Server) {
		const game = this.games.get(roomId);
		if (!game) return;

		// 1. ボールの移動
		game.ball.x += game.dx;
		game.ball.y += game.dy;

		// 2. 壁での跳ね返り（上下）
		if (
			(game.dy < 0 && game.ball.y <= 0) ||
			(game.dy > 0 && game.ball.y >= FIELD_HEIGHT)
		) {
			game.dy *= -1;
		}

		// 3. パドルとの衝突判定
		if (
			game.dx < 0 &&
			game.ball.x <= LEFTPAD_RIGHTMOST &&
			game.ball.x >= LEFTPAD_LEFTMOST
		) {
			if (
				game.ball.y >= game.leftPaddleY &&
				game.ball.y <= game.leftPaddleY + PAD_LENGTH
			) {
				// ヒットの所によって斜めの事も変わるように
				const hitPos = (game.ball.y - game.leftPaddleY) / PAD_LENGTH;
				game.dy = (hitPos - 0.5) * ANGLE_CHANGE;
				game.dx *= SPEED_CHANGE;
			}
		}
		if (
			game.dx > 0 &&
			game.ball.x >= RIGHTPAD_LEFTMOST &&
			game.ball.x <= RIGHTPAD_RIGHTMOST
		) {
			if (
				game.ball.y >= game.rightPaddleY &&
				game.ball.y <= game.rightPaddleY + PAD_LENGTH
			) {
				// ヒットの所によって斜めの事も変わるように
				const hitPos = (game.ball.y - game.rightPaddleY) / PAD_LENGTH;
				game.dy = (hitPos - 0.5) * ANGLE_CHANGE;
				game.dx *= SPEED_CHANGE;
			}
		}

		// 4. スコア判定
		if (game.ball.x <= 0 || game.ball.x >= FIELD_WIDTH) {
			if (game.ball.x <= 0) game.rightScore++;
			else game.leftScore++;

			game.ball = { ...FIELD_CENTER };
			game.dx = game.dx > 0 ? -SPEED_BASE : SPEED_BASE;
			game.dy = SPEED_BASE;
		}

		// 5. 終了判定とDB保存
		if (game.leftScore >= MAX_SCORE || game.rightScore >= MAX_SCORE) {
			clearInterval(game.interval);

			const winnerId = game.leftScore >= MAX_SCORE ? game.p1Id : game.p2Id;
			const loserId = game.leftScore >= MAX_SCORE ? game.p2Id : game.p1Id;
			const winnerScore = Math.max(game.leftScore, game.rightScore);
			const loserScore = Math.min(game.leftScore, game.rightScore);

			// 最終スコアを送信（11点を反映）
			/* eslint-disable @typescript-eslint/no-unused-vars */
			const { dx, dy, p1Id, p2Id, interval, ...finalState } = game;
			/* eslint-enable @typescript-eslint/no-unused-vars */
			server.to(roomId).emit("updateState", finalState);

			// フロントエンドに終了を通知
			server.to(roomId).emit("gameOver", { winner: winnerId });

			// DBへ試合結果を保存（非同期）
			this.saveMatchResult(winnerId, loserId, winnerScore, loserScore);

			this.games.delete(roomId);
			return;
		}

		// 6. 状態配信
		/* eslint-disable @typescript-eslint/no-unused-vars */
		const { dx, dy, p1Id, p2Id, interval, ...publicState } = game;
		/* eslint-enable @typescript-eslint/no-unused-vars */
		server.to(roomId).emit("updateState", publicState);
	}

	// 試合結果をDBに保存する内部メソッド
	private async saveMatchResult(
		wId: string,
		lId: string,
		wScore: number,
		lScore: number,
	) {
		try {
			const history = this.matchHistoryRepository.create({
				winnerId: wId,
				loserId: lId,
				winnerScore: wScore,
				loserScore: lScore,
			});
			await this.matchHistoryRepository.save(history);
			console.log("試合結果をDBに保存しました");
		} catch (error) {
			console.error("試合結果の保存に失敗しました:", error);
		}
	}

	updatePaddle(playerId: string, y: number) {
		//managing bad y
		if (y < 0 || y > UPPER_LIMIT) {
			console.error("[Game]怪しいｙが気まあしてアレンジします。");
			if (y < 0) y = 0;
			else y = UPPER_LIMIT;
		}
		for (const [, game] of this.games.entries()) {
			// ★ roomId を消して「,」だけにする
			if (game.p1Id === playerId) {
				if (Math.abs(game.leftPaddleY - y) > PAD_SPEED) {
					console.log(
						"[GameService] WARNING: Pad早すぎてcheatかも。無視にします",
					);
					return;
				}
				game.leftPaddleY = y;
				break;
			} else if (game.p2Id === playerId) {
				if (Math.abs(game.rightPaddleY - y) > PAD_SPEED) {
					console.log(
						"[GameService] WARNING: Pad早すぎてcheatかも。無視にします",
					);
					return;
				}
				game.rightPaddleY = y;
				break;
			}
		}
	}

	handleDisconnect(client: Socket, server: Server) {
		console.log(`[GameService] Handling disconnect: ${client.id}`);

		// disconnected人をQueueから消す
		this.queue = this.queue.filter((s) => s.id !== client.id);
		console.log(
			"Queue:",
			this.queue.map((s) => s.id),
		);

		// 試合中だったら。。。
		for (const [roomId, game] of this.games.entries()) {
			if (game.p1Id === client.id || game.p2Id === client.id) {
				console.log(`[GameService] Player left match ${roomId}`);

				// 試合をストップ
				clearInterval(game.interval);

				const isP1 = game.p1Id === client.id;
				const winnerId = isP1 ? game.p2Id : game.p1Id;
				const loserId = client.id;

				// 試合終了の知らせ
				server.to(roomId).emit("gameOver", {
					winner: winnerId,
					reason: "disconnect",
				});

				// DBにセーブ
				const winnerScore = MAX_SCORE;
				const loserScore = isP1 ? game.leftScore : game.rightScore;
				this.saveMatchResult(winnerId, loserId, winnerScore, loserScore);

				this.games.delete(roomId);
				break;
			}
		}
	}
}
