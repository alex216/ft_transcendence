import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { parse } from "cookie";
import { JwtService } from "@nestjs/jwt";
import { GameService } from "./game.service";
import { PaddleMoveDto } from "../../../shared/game.interface";
import { corsConfig } from "../cors.config";

// userId を保持する拡張型
interface AuthenticatedSocket extends Socket {
	data: {
		userId?: number;
	};
}

@WebSocketGateway({
	cors: corsConfig,
	namespace: "game",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	constructor(
		private readonly gameService: GameService,
		private readonly jwtService: JwtService,
	) {}

	// WebSocket 接続時に一度だけ認証し、userId を client.data に保存する
	// これにより各イベントハンドラで毎回 Cookie を読み直す必要がなくなる
	handleConnection(client: AuthenticatedSocket) {
		const cookieHeader = client.handshake.headers.cookie;
		if (!cookieHeader) {
			console.warn(`[GameGateway] Cookie なし → 切断 (socket=${client.id})`);
			client.disconnect();
			return;
		}

		const token = parse(cookieHeader)["access_token"];
		if (!token) {
			console.warn(
				`[GameGateway] access_token Cookie なし → 切断 (socket=${client.id})`,
			);
			client.disconnect();
			return;
		}

		try {
			const payload = this.jwtService.verify<{ sub: number }>(token);
			client.data.userId = payload.sub;
			console.log(
				`[GameGateway] 接続認証OK userId=${client.data.userId} (socket=${client.id})`,
			);
		} catch (err) {
			console.warn(
				`[GameGateway] JWT 検証失敗 → 切断 (socket=${client.id}):`,
				err,
			);
			client.disconnect();
		}
	}

	// 1. マッチメイキング待ち列に参加
	@SubscribeMessage("joinQueue")
	handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.userId;
		console.log(
			`[GameGateway] joinQueue userId=${userId} (socket=${client.id})`,
		);
		this.gameService.addToQueue(client, this.server, userId);
	}

	// 2. パドル操作
	@SubscribeMessage("movePaddle")
	handleMove(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: PaddleMoveDto,
	) {
		if (!data || typeof data.y !== "number" || !isFinite(data.y)) {
			return;
		}
		this.gameService.updatePaddle(client.id, data.y);
	}

	// 3. 切断
	handleDisconnect(client: AuthenticatedSocket) {
		console.log(
			`[GameGateway] 切断 userId=${client.data.userId} (socket=${client.id})`,
		);
		this.gameService.handleDisconnect(client, this.server);
	}
}
