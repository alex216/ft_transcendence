import { Injectable } from "@nestjs/common";
import { Socket, Server } from "socket.io";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MatchHistory } from "./match-history.entity";
import { GameState } from "../../../shared/game.interface";

// サーバー内部でのみ管理する物理パラメータ（フロントには送らない）
interface GameInternalState extends GameState {
	dx: number;
	dy: number;
	p1Id: string;
	p2Id: string;
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
			ball: { x: 400, y: 300 },
			leftPaddleY: 250,
			rightPaddleY: 250,
			leftScore: 0,
			rightScore: 0,
			isPaused: false,
			dx: 5,
			dy: 5,
			p1Id: p1Id,
			p2Id: p2Id,
		};

		this.games.set(roomId, initialState);

		const interval = setInterval(() => {
			this.gameLoop(roomId, server, interval);
		}, 1000 / 60);
	}

	private gameLoop(roomId: string, server: Server, interval: NodeJS.Timeout) {
		const game = this.games.get(roomId);
		if (!game) return;

		// 1. ボールの移動
		game.ball.x += game.dx;
		game.ball.y += game.dy;

		// 2. 壁での跳ね返り（上下）
		if (game.ball.y <= 0 || game.ball.y >= 600) {
			game.dy *= -1;
		}

		// 3. パドルとの衝突判定
		if (game.ball.x <= 60 && game.ball.x >= 40) {
			if (
				game.ball.y >= game.leftPaddleY &&
				game.ball.y <= game.leftPaddleY + 100
			) {
				game.dx *= -1.1;
			}
		}
		if (game.ball.x >= 740 && game.ball.x <= 760) {
			if (
				game.ball.y >= game.rightPaddleY &&
				game.ball.y <= game.rightPaddleY + 100
			) {
				game.dx *= -1.1;
			}
		}

		// 4. スコア判定
		if (game.ball.x <= 0 || game.ball.x >= 800) {
			if (game.ball.x <= 0) game.rightScore++;
			else game.leftScore++;

			game.ball = { x: 400, y: 300 };
			game.dx = game.dx > 0 ? -5 : 5;
		}

		// 5. 終了判定とDB保存
		if (game.leftScore >= 11 || game.rightScore >= 11) {
			clearInterval(interval);

			const winnerId = game.leftScore >= 11 ? game.p1Id : game.p2Id;
			const loserId = game.leftScore >= 11 ? game.p2Id : game.p1Id;
			const winnerScore = Math.max(game.leftScore, game.rightScore);
			const loserScore = Math.min(game.leftScore, game.rightScore);

			// フロントエンドに終了を通知
			server.to(roomId).emit("gameOver", { winner: winnerId });

			// DBへ試合結果を保存（非同期）
			this.saveMatchResult(winnerId, loserId, winnerScore, loserScore);

			this.games.delete(roomId);
			return;
		}

		// 6. 状態配信
		/* eslint-disable @typescript-eslint/no-unused-vars */
		const { dx, dy, p1Id, p2Id, ...publicState } = game;
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
		for (const [, game] of this.games.entries()) {
			// ★ roomId を消して「,」だけにする
			if (game.p1Id === playerId) {
				game.leftPaddleY = y;
				break;
			} else if (game.p2Id === playerId) {
				game.rightPaddleY = y;
				break;
			}
		}
	}
}
