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
	handleJoinQueue(@ConnectedSocket() client: Socket) {
		this.gameService.addToQueue(client, this.server);
	}

	// 2. プレイヤーのパドル操作を受信
	@SubscribeMessage("movePaddle")
	handleMove(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: PaddleMoveDto,
	) {
		// どの部屋の、どのプレイヤーが動いたかをServiceに伝える
		this.gameService.updatePaddle(client.id, data.y);
	}
}
