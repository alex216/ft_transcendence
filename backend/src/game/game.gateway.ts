import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
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

	constructor(
		private readonly gameService: GameService,
		private readonly jwtService: JwtService,
	) {}

	// Cookieヘッダーから access_token を取り出してユーザーIDを返す
	private extractUserId(client: Socket): number | undefined {
		const cookieHeader = client.handshake.headers.cookie;
		if (!cookieHeader) return undefined;

		// "key=value; key2=value2" 形式をパース
		const cookies: Record<string, string> = {};
		for (const pair of cookieHeader.split(";")) {
			const [k, ...rest] = pair.trim().split("=");
			if (k) cookies[k.trim()] = rest.join("=").trim();
		}

		const token = cookies["access_token"];
		if (!token) return undefined;

		try {
			const payload = this.jwtService.verify<{ sub: number }>(token);
			return payload.sub;
		} catch {
			return undefined;
		}
	}

	// 1. マッチメイキング待ち列に参加
	@SubscribeMessage("joinQueue")
	handleJoinQueue(@ConnectedSocket() client: Socket) {
		const userId = this.extractUserId(client);
		this.gameService.addToQueue(client, this.server, userId);
	}

	// 2. プレイヤーのパドル操作を受信
	@SubscribeMessage("movePaddle")
	handleMove(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: PaddleMoveDto,
	) {
		if (!data || typeof data.y !== "number" || !isFinite(data.y)) {
			return;
		}
		// どの部屋の、どのプレイヤーが動いたかをServiceに伝える
		this.gameService.updatePaddle(client.id, data.y);
	}

	// 3. Disconnection
	handleDisconnect(client: Socket) {
		console.log(`[Gateway] Disconnected: ${client.id}`);
		this.gameService.handleDisconnect(client, this.server);
	}
}
