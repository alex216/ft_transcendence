import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { parse } from "cookie";
import { JwtService } from "@nestjs/jwt";
import { GameService } from "./game.service";
import { AuthService } from "../auth/auth.service";

interface AuthenticatedSocket extends Socket {
	data: {
		user: {
			id: number;
			username?: string;
		};
	};
}

@WebSocketGateway({
	cors: {
		origin: "https://localhost",
		credentials: true,
	},
	namespace: "game",
})
export class GameGateway {
	@WebSocketServer()
	server: Server;

	constructor(
		private readonly gameService: GameService,
		private readonly authService: AuthService,
		private readonly jwtService: JwtService,
	) {}

	// coming from the merge main. It will be used to refine handleConnection
	private extractUserId(client: Socket): number | undefined {
		const cookieHeader = client.handshake.headers.cookie;
		if (!cookieHeader) return undefined;

		const cookies = parse(cookieHeader);
		const token = cookies["access_token"];
		if (!token) return undefined;

		try {
			const payload = this.jwtService.verify<{ sub: number }>(token);
			return payload.sub;
		} catch {
			return undefined;
		}
	}

	async handleConnection(client: AuthenticatedSocket) {
		try {
			const userId = this.extractUserId(client);

			if (!userId) {
				console.log("No valid token → dummy user");
				client.data.user = { id: Math.floor(Math.random() * 1000) + 1 };
				return;
			}

			client.data.user = { id: userId };
			console.log(`[WS] Connected user: ${client.data.user.id}`);
		} catch (e) {
			console.log("Connection error:", e);
			client.disconnect();
		}
	}

	@SubscribeMessage("joinAIGame")
	handleJoinAIGame(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		this.gameService.createAIGame(client, userId, this.server);
	}

	@SubscribeMessage("joinQueue")
	handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
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
		console.log(`[Gateway] Disconnected: ${client.id}`);
		this.gameService.handleDisconnect(client, this.server);
	}

	@SubscribeMessage("reconnectGame")
	handleReconnect(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string },
	) {
		const userId = client.data.user.id;
		this.gameService.handleReconnect(client, data.roomId, this.server, userId);
	}

	@SubscribeMessage("surrender")
	handleSurrender(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		this.gameService.handleSurrender(client, this.server, userId);
	}
}
