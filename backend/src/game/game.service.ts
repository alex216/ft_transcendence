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
	SPEED_BASE,
	SPEED_CHANGE,
	MAX_SCORE,
	ANGLE_CHANGE,
	PAD_SPEED,
	AI_ID,
} from "../../../shared/game.constants";

// サーバー内部でのみ管理する物理パラメータ（フロントには送らない）
interface GameInternalState extends GameState {
	dx: number;
	dy: number;
	p1Id: number;
	p2Id: number;
	interval: NodeJS.Timeout | null;
	disconnectTimer?: NodeJS.Timeout | null;
	disconnectedPlayerId?: number;
}

@Injectable()
export class GameService {
	constructor(
		@InjectRepository(MatchHistory)
		private readonly matchHistoryRepository: Repository<MatchHistory>,
	) {}

	private AIgames = new Map<string, GameInternalState>();
	private games = new Map<string, GameInternalState>();
	private queue: Socket[] = [];
	// added to track better players reconnecting
	private socketToPlayer = new Map<string, number>();

	createAIGame(client: Socket, playerId: number, server: Server) {
		console.log(`[Game] Starting AI game for player ${playerId}`);

		const roomId = `ai_${client.id}`;
		client.join(roomId);

		const initialState: GameInternalState = {
			ball: { ...FIELD_CENTER },
			leftPaddleY: STARTING_POSITION,
			rightPaddleY: STARTING_POSITION,
			leftScore: 0,
			rightScore: 0,
			isPaused: false,
			dx: SPEED_BASE,
			dy: SPEED_BASE,
			p1Id: playerId,
			p2Id: AI_ID,
			interval: null,
		};

		const interval = setInterval(() => {
			this.AIgameLoop(roomId, server);
		}, 1000 / 60);

		initialState.interval = interval;
		this.AIgames.set(roomId, initialState);
	}

	private AIgameLoop(roomId: string, server: Server) {
		const game = this.AIgames.get(roomId);
		if (!game || game.isPaused) return;

		// 1. ball movement
		game.ball.x += game.dx;
		game.ball.y += game.dy;

		// 2. up and down bounce
		if (
			(game.dy < 0 && game.ball.y <= 0) ||
			(game.dy > 0 && game.ball.y >= FIELD_HEIGHT)
		) {
			game.dy *= -1;
		}

		// 3. player paddle collision
		if (
			game.dx < 0 &&
			game.ball.x <= LEFTPAD_RIGHTMOST &&
			game.ball.x >= LEFTPAD_LEFTMOST
		) {
			if (
				game.ball.y >= game.leftPaddleY &&
				game.ball.y <= game.leftPaddleY + PAD_LENGTH
			) {
				const hitPos = (game.ball.y - game.leftPaddleY) / PAD_LENGTH;
				game.dy = (hitPos - 0.5) * ANGLE_CHANGE;
				game.dx *= SPEED_CHANGE;
			}
		}

		// 4. AI paddle movement
		const aiSpeed = 3; // px per frame
		if (game.dx > 0) {
			// muovi il paddle AI verso la palla
			if (game.ball.y > game.rightPaddleY + PAD_LENGTH / 2) {
				game.rightPaddleY = Math.min(
					FIELD_HEIGHT - PAD_LENGTH,
					game.rightPaddleY + aiSpeed,
				);
			} else {
				game.rightPaddleY = Math.max(0, game.rightPaddleY - aiSpeed);
			}

			// AI paddle collision
			if (
				game.ball.x >= RIGHTPAD_LEFTMOST &&
				game.ball.x <= RIGHTPAD_RIGHTMOST
			) {
				if (
					game.ball.y >= game.rightPaddleY &&
					game.ball.y <= game.rightPaddleY + PAD_LENGTH
				) {
					const hitPos = (game.ball.y - game.rightPaddleY) / PAD_LENGTH;
					game.dy = (hitPos - 0.5) * ANGLE_CHANGE;
					game.dx *= SPEED_CHANGE;
				}
			}
		}

		// 5. check for gameover
		if (game.ball.x <= 0 || game.ball.x >= FIELD_WIDTH) {
			if (game.ball.x <= 0) game.rightScore++;
			else game.leftScore++;

			game.ball = { ...FIELD_CENTER };
			game.dx = game.dx > 0 ? -SPEED_BASE : SPEED_BASE;
			game.dy = SPEED_BASE;
		}

		if (game.leftScore >= MAX_SCORE || game.rightScore >= MAX_SCORE) {
			clearInterval(game.interval);
			this.AIgames.delete(roomId);

			const winnerId = game.leftScore >= MAX_SCORE ? game.p1Id : game.p2Id;
			const loserId = game.leftScore >= MAX_SCORE ? game.p2Id : game.p1Id;

			server.to(roomId).emit("gameOver", { winner: winnerId });
			// not saving result for aiGames
		}

		// sending status to the client
		const { dx, dy, p1Id, p2Id, interval, ...publicState } = game;
		server.to(roomId).emit("updateState", publicState);
	}

	// マッチメイキング
	addToQueue(client: Socket, playerId: number, server: Server) {
		console.log(`[Game] Player joined queue: ${playerId}`);

		if (this.queue.find((s) => s.id === client.id)) return;
		this.queue.push(client);
		console.log(
			"Queue:",
			this.queue.map((s) => s.id),
		);

		// added to track better players reconnecting
		this.socketToPlayer.set(client.id, playerId);

		if (this.queue.length >= 2) {
			console.log(`[Game] Match found! Starting game...`);
			const p1 = this.queue.shift()!;
			const p2 = this.queue.shift()!;
			const roomId = `room_${p1.id}`;

			p1.join(roomId);
			p2.join(roomId);

			this.initGame(
				roomId,
				this.socketToPlayer.get(p1.id)!,
				this.socketToPlayer.get(p2.id)!,
				server,
			);
		}
	}

	// ゲームの初期化
	initGame(roomId: string, p1Id: number, p2Id: number, server: Server) {
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
		if (!game || game.isPaused) return;

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
			if (game.disconnectTimer) clearTimeout(game.disconnectTimer);

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
			this.saveMatchResult(
				winnerId.toString(),
				loserId.toString(),
				winnerScore,
				loserScore,
			);

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

	movePaddleUp(playerId: number) {
		for (const [, game] of this.games.entries()) {
			if (game.p1Id === playerId) {
				game.leftPaddleY = Math.max(0, game.leftPaddleY - PAD_SPEED);
				break;
			} else if (game.p2Id === playerId) {
				game.rightPaddleY = Math.max(0, game.rightPaddleY - PAD_SPEED);
				break;
			}
		}
	}

	movePaddleDown(playerId: number) {
		for (const [, game] of this.games.entries()) {
			if (game.p1Id === playerId) {
				game.leftPaddleY = Math.min(
					FIELD_HEIGHT - PAD_LENGTH,
					game.leftPaddleY + PAD_SPEED,
				);
				break;
			} else if (game.p2Id === playerId) {
				game.rightPaddleY = Math.min(
					FIELD_HEIGHT - PAD_LENGTH,
					game.rightPaddleY + PAD_SPEED,
				);
				break;
			}
		}
	}

	handleDisconnect(client: Socket, server: Server) {
		console.log(`[GameService] Handling disconnect: ${client.id}`);

		// clearing the mapping
		const playerId = this.socketToPlayer.get(client.id);
		if (playerId === undefined) return;
		this.socketToPlayer.delete(client.id);

		// disconnected人をQueueから消す
		this.queue = this.queue.filter((s) => s.id !== client.id);
		console.log(
			"Queue:",
			this.queue.map((s) => s.id),
		);

		// 試合中だったら。。。
		for (const [roomId, game] of this.games.entries()) {
			if (game.p1Id === playerId || game.p2Id === playerId) {
				console.log(
					`[GameService] Player left match ${roomId}, waiting reconnection`,
				);

				// set up waiting time
				game.isPaused = true;
				game.disconnectedPlayerId = playerId;

				// notify other player
				const otherId = game.p1Id === playerId ? game.p2Id : game.p1Id;
				server.to(roomId).emit("playerDisconnected", { playerId: playerId });

				// get rid of old timer, if any
				if (game.disconnectTimer) {
					clearTimeout(game.disconnectTimer);
				}

				game.disconnectTimer = setTimeout(() => {
					console.log(
						`[GameService] Grace period expired, ending match ${roomId}`,
					);

					clearInterval(game.interval);
					game.interval = null;

					const winnerId = otherId;
					const loserId = game.disconnectedPlayerId ?? playerId;

					server.to(roomId).emit("gameOver", {
						winner: winnerId,
						reason: "disconnect",
					});

					// DBにセーブ
					const winnerScore = MAX_SCORE;
					const loserScore =
						game.p1Id === playerId ? game.leftScore : game.rightScore;
					this.saveMatchResult(
						winnerId.toString(),
						loserId.toString(),
						winnerScore,
						loserScore,
					);

					this.games.delete(roomId);
				}, 15000);
				return;
			}
		}

		// AI matches
		for (const [roomId, game] of this.AIgames.entries()) {
			if (game.p1Id === playerId) {
				console.log(`[GameService] Player disconnected from AI game ${roomId}`);
				if (game.interval) clearInterval(game.interval);
				this.AIgames.delete(roomId);
				server.to(roomId).emit("gameOver", {
					winner: 0,
					reason: "disconnectAI",
				});
				break;
			}
		}
	}

	handleReconnect(
		client: Socket,
		roomId: string,
		server: Server,
		playerId: number,
	) {
		const game = this.games.get(roomId);
		if (!game || game.disconnectedPlayerId !== playerId) return;

		console.log(`[GameService] Player reconnected: ${playerId} in ${roomId}`);

		this.socketToPlayer.set(client.id, playerId);

		if (game.disconnectTimer) {
			clearTimeout(game.disconnectTimer);
			game.disconnectTimer = null;
		}

		game.isPaused = false;
		game.disconnectedPlayerId = undefined;

		server.to(roomId).emit("playerReconnected", { playerId });

		// send state to reconnected player
		const {
			dx,
			dy,
			p1Id,
			p2Id,
			interval,
			disconnectTimer,
			disconnectedPlayerId,
			...publicState
		} = game;
		client.emit("updateState", publicState);

		if (!game.interval) {
			game.interval = setInterval(
				() => this.gameLoop(roomId, server),
				1000 / 60,
			);
		}
	}

	handleSurrender(client: Socket, server: Server, playerId: number) {
		console.log(`[GameService] Player surrendered: ${playerId}`);

		for (const [roomId, game] of this.games.entries()) {
			if (game.p1Id === playerId || game.p2Id === playerId) {
				if (game.disconnectTimer) {
					clearTimeout(game.disconnectTimer);
					game.disconnectTimer = null;
				}

				clearInterval(game.interval);

				const isP1 = game.p1Id === playerId;
				const winnerId = isP1 ? game.p2Id : game.p1Id;
				const loserId = playerId;

				server.to(roomId).emit("gameOver", {
					winner: winnerId,
					reason: "surrender",
				});

				const winnerScore = MAX_SCORE;
				const loserScore = isP1 ? game.leftScore : game.rightScore;

				this.saveMatchResult(
					winnerId.toString(),
					loserId.toString(),
					winnerScore,
					loserScore,
				);

				this.games.delete(roomId);
				break;
			}
		}
	}
}
