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
import { corsConfig } from "../cors.config";

interface AuthenticatedSocket extends Socket {
	data: {
		user: {
			id: number;
			username?: string;
		};
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

	// WebSocket 接続時に一度だけ認証し、user を client.data に保存する
	// これにより各イベントハンドラで毎回 Cookie を読み直す必要がなくなる
	async handleConnection(client: AuthenticatedSocket) {
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
			client.data.user = { id: payload.sub };
			console.log(
				`[GameGateway] 接続認証OK userId=${client.data.user.id} (socket=${client.id})`,
			);
		} catch (err) {
			console.warn(
				`[GameGateway] JWT 検証失敗 → 切断 (socket=${client.id}):`,
				err,
			);
			client.disconnect();
		}
	}

	@SubscribeMessage("joinAIGame")
	handleJoinAIGame(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[GameGateway] joinAIGame: ${userId}`);
		this.gameService.createAIGame(client, userId, this.server);
	}

	@SubscribeMessage("joinQueue")
	handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(
			`[GameGateway] joinQueue userId=${userId} (socket=${client.id})`,
		);
		this.gameService.addToQueue(client, this.server, userId);
	}

	@SubscribeMessage("moveUp")
	handleMoveUp(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		this.gameService.movePaddleUp(userId);
	}

	@SubscribeMessage("moveDown")
	handleMoveDown(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		this.gameService.movePaddleDown(userId);
	}

	handleDisconnect(client: AuthenticatedSocket) {
		const userId = client.data?.user?.id;
		if (!userId) return;
		console.log(`[GameGateway] 切断 userId=${userId} (socket=${client.id})`);
		this.gameService.handleDisconnect(client, this.server, userId);
	}

	@SubscribeMessage("reconnectGame")
	handleReconnect(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string },
	) {
		const userId = client.data.user.id;
		console.log(`[GameGateway] Reconnecting: ${userId}`);
		this.gameService.handleReconnect(client, data.roomId, this.server, userId);
	}

	@SubscribeMessage("surrender")
	handleSurrender(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[GameGateway] Surrendering: ${userId}`);
		this.gameService.handleSurrender(this.server, userId);
	}
}
