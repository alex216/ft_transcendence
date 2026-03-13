import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { PaddleMoveDto } from "../../../shared/game.interface";

@WebSocketGateway({
	cors: {
		origin: "*",
	},
	namespace: "game", // ゲーム専用の入り口
})
export class GameGateway {
	@WebSocketServer()
	server: Server; // ゲームの状態を一斉送信するために使用します

	constructor(private readonly gameService: GameService) {}

	// 1. マッチメイキング待ち列に参加
	@SubscribeMessage("joinQueue")
	handleJoinQueue(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { playerId: string },
	) {
		this.gameService.addToQueue(client, data.playerId, this.server);
	}

	// 2. プレイヤーのパドル操作を受信
	// @SubscribeMessage("movePaddle")
	// handleMove(
	// 	@ConnectedSocket() client: Socket,
	// 	@MessageBody() data: PaddleMoveDto,
	// ) {
	// 	// どの部屋の、どのプレイヤーが動いたかをServiceに伝える
	// 	this.gameService.updatePaddle(client.id, data.y);
	// }

	//2.1 UP
	@SubscribeMessage("moveUp")
	handleMoveUp(@MessageBody() data: { playerId: string }) {
		this.gameService.movePaddleUp(data.playerId);
	}

	//2.2 DOWN
	@SubscribeMessage("moveDown")
	handleMoveDown(@MessageBody() data: { playerId: string }) {
		this.gameService.movePaddleDown(data.playerId);
	}

	// 3. Disconnection
	handleDisconnect(client: Socket) {
		console.log(`[Gateway] Disconnected: ${client.id}`);
		this.gameService.handleDisconnect(client, this.server);
	}

	// 4. Reconnection
	@SubscribeMessage("reconnectGame")
	handleReconnect(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { roomId: string; playerId: string },
	) {
		this.gameService.handleReconnect(
			client,
			data.roomId,
			this.server,
			data.playerId,
		);
	}

	// 5. Resignation
	@SubscribeMessage("surrender")
	handleSurrender(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { playerId: string },
	) {
		this.gameService.handleSurrender(client, this.server, data.playerId);
	}
}
