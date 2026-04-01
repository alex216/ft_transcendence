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
				console.log("[Game.Gateway] No valid token → disconnect");
				client.disconnect();
				return;
			}

			client.data.user = { id: userId };
			console.log(`[Game.Gateway] Connected user: ${client.data.user.id}`);
		} catch (e) {
			console.log("[Game.Gateway]Connection error:", e);
			client.disconnect();
		}
	}

	@SubscribeMessage("joinAIGame")
	handleJoinAIGame(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] joinAIGame: ${userId}`);
		this.gameService.createAIGame(client, userId, this.server);
	}

	@SubscribeMessage("joinQueue")
	handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] joinQueue: ${userId}`);
		this.gameService.addToQueue(client, this.server, userId);
	}

	@SubscribeMessage("moveUp")
	handleMoveUp(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] moveUp: ${userId}`);
		this.gameService.movePaddleUp(userId);
	}

	@SubscribeMessage("moveDown")
	handleMoveDown(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] moveDown: ${userId}`);
		this.gameService.movePaddleDown(userId);
	}

	handleDisconnect(client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] Disconnected: ${userId}`);
		this.gameService.handleDisconnect(client, this.server, userId);
	}

	@SubscribeMessage("reconnectGame")
	handleReconnect(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string },
	) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] Reconnecting: ${userId}`);
		this.gameService.handleReconnect(client, data.roomId, this.server, userId);
	}

	@SubscribeMessage("surrender")
	handleSurrender(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		console.log(`[Game.Gateway] Surrendering: ${userId}`);
		this.gameService.handleSurrender(this.server, userId);
	}
}
