import { Injectable } from "@nestjs/common";
import { Socket, Server } from "socket.io";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MatchHistory } from "./match-history.entity";
import { GameState, GameStateDto } from "../../../shared/game.interface";
import { randomUUID } from "crypto";
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
	AI_SOCKET_ID,
	AI_USER_ID,
} from "../../../shared/game.constants";

// サーバー内部でのみ管理する物理パラメータ（フロントには送らない）
interface GameInternalState extends GameState {
	roomId: string;
	dx: number;
	dy: number;
	p1SocketId: string;
	p2SocketId: string;
	p1UserId: number; // 認証済みユーザーのDB ID（統計用）
	p2UserId: number;
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

	// キューにユーザーIDも一緒に保持する
	private queue: { socket: Socket; userId: number }[] = [];
	private AIgames = new Map<string, GameInternalState>();
	private games = new Map<string, GameInternalState>();

	// faster operations on movepaddle etc
	private userIdToRoom = new Map<number, string>();

	// faster handleing of disconnections and reconnections
	private socketToPlayer = new Map<string, number>();

	private toDto(game: GameInternalState): GameStateDto {
		return {
			roomId: game.roomId,
			state: {
				ball: game.ball,
				leftPaddleY: game.leftPaddleY,
				rightPaddleY: game.rightPaddleY,
				leftScore: game.leftScore,
				rightScore: game.rightScore,
				isPaused: game.isPaused,
			},
		};
	}

	createAIGame(client: Socket, playerId: number, server: Server) {
		const roomId = `room_${randomUUID()}`;
		console.log(
			`[Game.Service] CreateAIgame for player ${playerId} in room number ${roomId}`,
		);
		client.join(roomId);

		const initialState: GameInternalState = {
			roomId: roomId,
			ball: { ...FIELD_CENTER },
			leftPaddleY: STARTING_POSITION,
			rightPaddleY: STARTING_POSITION,
			leftScore: 0,
			rightScore: 0,
			isPaused: false,
			dx: SPEED_BASE,
			dy: SPEED_BASE,
			p1SocketId: client.id,
			p2SocketId: AI_SOCKET_ID,
			p1UserId: playerId,
			p2UserId: AI_USER_ID,
			interval: null,
		};

		const interval = setInterval(() => {
			this.AIgameLoop(roomId, server);
		}, 1000 / 60);

		initialState.interval = interval;
		this.AIgames.set(roomId, initialState);
		this.userIdToRoom.set(playerId, roomId);
		this.socketToPlayer.set(client.id, playerId);
		console.log(
			`[Game.Service] Successfully starting AIgame for player ${playerId} in room number ${roomId}`,
		);
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

		// 4. AI paddle behavior (provvisory)
		const aiSpeed = 3;
		if (game.dx > 0) {
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

		// 5. check for goal
		if (game.ball.x <= 0 || game.ball.x >= FIELD_WIDTH) {
			if (game.ball.x <= 0) game.rightScore++;
			else game.leftScore++;

			game.ball = { ...FIELD_CENTER };
			game.dx = game.dx > 0 ? -SPEED_BASE : SPEED_BASE;
			game.dy = SPEED_BASE;
		}

		// 6. check for gameover
		//	on gameover, we are sending the socketId of the winner like in the online case,
		//	in the front, please remember to check the AI_SOCKET_ID in the shared/game.constants
		if (game.leftScore >= MAX_SCORE || game.rightScore >= MAX_SCORE) {
			clearInterval(game.interval);

			const winnerSocketId =
				game.leftScore >= MAX_SCORE ? game.p1SocketId : game.p2SocketId;

			console.log(
				`[Game.Service] AIgameOver. winnerSocketId->${winnerSocketId}`,
			);
			server.to(roomId).emit("gameOver", { winner: winnerSocketId, roomId });
			// not saving result for aiGames
			this.AIgames.delete(roomId);
			this.userIdToRoom.delete(game.p1UserId);
			this.socketToPlayer.delete(game.p1SocketId);
			return;
		}

		server.to(roomId).emit("updateState", this.toDto(game));
	}

	// マッチメイキング
	addToQueue(client: Socket, server: Server, userId: number) {
		console.log(`[Game.Service] addToQueue: ${userId}`);

		if (
			this.queue.find((q) => q.socket.id === client.id) ||
			this.queue.find((q) => q.userId === userId)
		) {
			console.log(`[Game.Service] user was already in queue: ${userId}`);
			return;
		}
		this.queue.push({ socket: client, userId });
		console.log(
			"[Game.Service] Queue: ",
			this.queue.map((q) => q.userId),
		);

		if (this.queue.length >= 2) {
			const p1 = this.queue.shift()!;
			const p2 = this.queue.shift()!;
			const roomId = `room_${randomUUID()}`;

			p1.socket.join(roomId);
			p2.socket.join(roomId);

			this.initGame(
				roomId,
				p1.socket.id,
				p2.socket.id,
				server,
				p1.userId,
				p2.userId,
			);
			console.log(
				`[Game.Service] Match found! Starting game for players ${p1.userId} and ${p2.userId} in room number ${roomId}`,
			);
		}
	}

	// ゲームの初期化
	initGame(
		roomId: string,
		p1SocketId: string,
		p2SocketId: string,
		server: Server,
		p1UserId: number,
		p2UserId: number,
	) {
		const initialState: GameInternalState = {
			roomId: roomId,
			ball: { ...FIELD_CENTER },
			leftPaddleY: STARTING_POSITION,
			rightPaddleY: STARTING_POSITION,
			leftScore: 0,
			rightScore: 0,
			isPaused: false,
			dx: SPEED_BASE,
			dy: SPEED_BASE,
			p1SocketId,
			p2SocketId,
			p1UserId,
			p2UserId,
			interval: null,
		};

		const interval = setInterval(() => {
			this.gameLoop(roomId, server);
		}, 1000 / 60);

		initialState.interval = interval;

		this.games.set(roomId, initialState);
		if (p1UserId) this.userIdToRoom.set(p1UserId, roomId);
		if (p2UserId) this.userIdToRoom.set(p2UserId, roomId);
		this.socketToPlayer.set(p1SocketId, p1UserId);
		this.socketToPlayer.set(p2SocketId, p2UserId);
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

			const isP1Winner = game.leftScore >= MAX_SCORE;
			const winnerSocketId = isP1Winner ? game.p1SocketId : game.p2SocketId;
			const winnerUserId = isP1Winner ? game.p1UserId : game.p2UserId;
			const loserUserId = isP1Winner ? game.p2UserId : game.p1UserId;
			const winnerScore = Math.max(game.leftScore, game.rightScore);
			const loserScore = Math.min(game.leftScore, game.rightScore);

			// 最終スコアを送信（11点を反映）
			server.to(roomId).emit("updateState", this.toDto(game));

			// フロントエンドに終了を通知
			server.to(roomId).emit("gameOver", { winner: winnerSocketId, roomId });

			// DBへ試合結果を保存（非同期）
			console.log(
				`[Game.Service] saving result: Winner->${winnerUserId} Loser->${loserUserId}`,
			);
			this.saveMatchResult(winnerScore, loserScore, winnerUserId, loserUserId);

			this.games.delete(roomId);
			this.userIdToRoom.delete(game.p1UserId);
			this.userIdToRoom.delete(game.p2UserId);
			this.socketToPlayer.delete(game.p1SocketId);
			this.socketToPlayer.delete(game.p2SocketId);
			return;
		}

		// 6. 状態配信
		server.to(roomId).emit("updateState", this.toDto(game));
	}

	// 試合結果をDBに保存する内部メソッド
	private async saveMatchResult(
		wScore: number,
		lScore: number,
		wUserId?: number,
		lUserId?: number,
	) {
		try {
			const history = this.matchHistoryRepository.create({
				winnerUserId: wUserId,
				loserUserId: lUserId,
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
		const roomId = this.userIdToRoom.get(playerId);
		if (!roomId) return;
		const game = this.games.get(roomId) || this.AIgames.get(roomId);
		if (!game) return;

		if (game.p1UserId === playerId) {
			game.leftPaddleY = Math.max(0, game.leftPaddleY - PAD_SPEED);
		} else if (game.p2UserId === playerId) {
			game.rightPaddleY = Math.max(0, game.rightPaddleY - PAD_SPEED);
		}
	}

	movePaddleDown(playerId: number) {
		const roomId = this.userIdToRoom.get(playerId);
		if (!roomId) return;
		const game = this.games.get(roomId) || this.AIgames.get(roomId);
		if (!game) return;

		if (game.p1UserId === playerId) {
			game.leftPaddleY = Math.min(
				FIELD_HEIGHT - PAD_LENGTH,
				game.leftPaddleY + PAD_SPEED,
			);
		} else if (game.p2UserId === playerId) {
			game.rightPaddleY = Math.min(
				FIELD_HEIGHT - PAD_LENGTH,
				game.rightPaddleY + PAD_SPEED,
			);
		}
	}

	handleDisconnect(client: Socket, server: Server, userId: number) {
		console.log(
			`[GameService] HandleDisconnect: socket->${client.id}, id->${userId}`,
		);

		// Removing from queue if not matched yet
		const queueIndex = this.queue.findIndex((q) => q.socket.id === client.id);
		if (queueIndex !== -1) {
			this.queue.splice(queueIndex, 1);
			this.socketToPlayer.delete(client.id);
			console.log(`[GameService] Player ${userId} removed from queue`);
			return; // no need for reconnection logic
		}

		this.socketToPlayer.delete(client.id);

		// Check if player is in an online match
		const roomId = this.userIdToRoom.get(userId);
		if (roomId && this.games.has(roomId)) {
			const game = this.games.get(roomId)!;

			console.log(
				`[GameService] Player ${userId} left match ${roomId}, waiting reconnection`,
			);

			game.isPaused = true;

			const otherSocketId =
				game.p1SocketId === client.id ? game.p2SocketId : game.p1SocketId;
			server
				.to(roomId)
				.emit("playerDisconnected", { playerSocketId: client.id });

			if (game.disconnectTimer) clearTimeout(game.disconnectTimer);

			game.disconnectTimer = setTimeout(() => {
				console.log(
					`[GameService] Grace period expired for player ${userId}, ending match ${roomId}`,
				);

				clearInterval(game.interval);
				game.interval = null;

				const winnerSocketId = otherSocketId;
				const loserSocketId = client.id;

				server.to(roomId).emit("gameOver", {
					winner: winnerSocketId,
					reason: "disconnect",
					roomId,
				});

				//saving in the DB
				const winnerUserId =
					game.p1SocketId === winnerSocketId ? game.p1UserId : game.p2UserId;
				const loserUserId =
					game.p1SocketId === loserSocketId ? game.p1UserId : game.p2UserId;
				const winnerScore =
					game.p1SocketId === winnerSocketId ? game.leftScore : game.rightScore;
				const loserScore =
					game.p1SocketId === loserSocketId ? game.leftScore : game.rightScore;
				this.saveMatchResult(
					winnerScore,
					loserScore,
					winnerUserId,
					loserUserId,
				);

				console.log(
					`[Game.Service] saving result: Winner->${winnerUserId} Loser->${loserUserId}`,
				);

				this.games.delete(roomId);
				this.userIdToRoom.delete(game.p1UserId);
				this.userIdToRoom.delete(game.p2UserId);
				this.socketToPlayer.delete(game.p1SocketId);
				this.socketToPlayer.delete(game.p2SocketId);
			}, 15000);

			return;
		}

		// AI matches (not waiting for reconnection)
		if (roomId && this.AIgames.has(roomId)) {
			const game = this.AIgames.get(roomId)!;
			console.log(`[GameService] Player disconnected from AI game ${roomId}`);

			if (game.interval) clearInterval(game.interval);
			this.AIgames.delete(roomId);
			this.userIdToRoom.delete(game.p1UserId);
			this.socketToPlayer.delete(game.p1SocketId);

			server.to(roomId).emit("gameOver", {
				winner: AI_SOCKET_ID,
				reason: "disconnectAI",
				roomId,
			});
		}
	}

	handleReconnect(
		client: Socket,
		roomId: string,
		server: Server,
		userId: number,
	) {
		const game = this.games.get(roomId);
		if (!game) {
			client.emit("reconnectFailed", { reason: "game_not_found" });
			return;
		}

		// Determine the player reconnecting and updating game attributes
		const isP1 = game.p1UserId === userId;
		const isP2 = game.p2UserId === userId;
		if (!isP1 && !isP2) {
			client.emit("reconnectFailed", { reason: "not_your_game" });
			return;
		}

		if (!game.interval && !game.disconnectTimer) {
			client.emit("reconnectFailed", { reason: "game_already_finished" });
			return;
		}
		if (isP1) game.p1SocketId = client.id;
		if (isP2) game.p2SocketId = client.id;

		console.log(`[GameService] Player reconnected: ${client.id} in ${roomId}`);

		// update the new socket for the reconnection
		this.socketToPlayer.set(client.id, userId);

		// join the room again
		client.join(roomId);

		// clear timer if still not clear
		if (game.disconnectTimer) {
			clearTimeout(game.disconnectTimer);
			game.disconnectTimer = null;
		}

		// resume game
		game.isPaused = false;

		// notify the other player
		server.to(roomId).emit("playerReconnected", { userId });

		// re-send gamestate to the reconnected player
		client.emit("updateState", this.toDto(game));

		// restart game loop if necessary
		if (!game.interval) {
			game.interval = setInterval(
				() => this.gameLoop(roomId, server),
				1000 / 60,
			);
		}
	}

	handleSurrender(server: Server, userId: number) {
		console.log(`[GameService] Player ${userId} surrendered`);
		const roomId = this.userIdToRoom.get(userId);
		if (!roomId) return;

		const game = this.games.get(roomId) || this.AIgames.get(roomId);
		if (!game) return;

		if (game.interval) {
			clearInterval(game.interval);
			game.interval = null;
		}
		const isP1 = game.p1UserId === userId;

		const winnerUserId = isP1 ? game.p2UserId : game.p1UserId;
		const loserUserId = isP1 ? game.p1UserId : game.p2UserId;
		const winnerScore = isP1 ? game.rightScore : game.leftScore;
		const loserScore = isP1 ? game.leftScore : game.rightScore;
		const winnerSocketId = isP1 ? game.p2SocketId : game.p1SocketId;

		server.to(roomId).emit("gameOver", {
			winner: winnerSocketId,
			reason: "surrender",
			roomId,
		});

		// online match
		if (this.games.has(roomId)) {
			this.saveMatchResult(winnerScore, loserScore, winnerUserId, loserUserId);

			this.userIdToRoom.delete(winnerUserId);
			this.userIdToRoom.delete(loserUserId);

			this.socketToPlayer.delete(game.p1SocketId);
			this.socketToPlayer.delete(game.p2SocketId);

			this.games.delete(roomId);
			return;
		}

		// AI match
		if (this.AIgames.has(roomId)) {
			this.userIdToRoom.delete(userId);
			this.socketToPlayer.delete(game.p1SocketId);

			this.AIgames.delete(roomId);
		}
	}
}
