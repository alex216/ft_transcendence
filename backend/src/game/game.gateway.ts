import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameService } from "./game.service";
import { AuthService } from "../auth/auth.service";
import { UnauthorizedException } from "@nestjs/common";
import * as cookie from "cookie";

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
	) {}

	async handleConnection(client: AuthenticatedSocket) {
		try {
			const rawCookie = client.handshake.headers.cookie;
			if (!rawCookie) throw new UnauthorizedException();

			const cookies = cookie.parse(rawCookie);
			const token = cookies["access_token"];
			if (!token) throw new UnauthorizedException();

			let payload: { sub: number };

			if (token) {
				// TODO: substitute with authService.verifyTokenForSocket when it will be ready
				payload = { sub: parseInt(token) }; // dummy: using token
			} else {
				// Dummy fallback for local testing: random ID
				payload = { sub: Math.floor(Math.random() * 1000) + 1 };
			}
			client.data.user = { id: payload.sub };

			console.log(`[WS] Connected user: ${client.data.user.id}`);
		} catch (e) {
			console.log("[WS] Unauthorized connection");
			client.disconnect();
		}
	}

	@SubscribeMessage("joinQueue")
	handleJoinQueue(@ConnectedSocket() client: AuthenticatedSocket) {
		const userId = client.data.user.id;
		this.gameService.addToQueue(client, userId, this.server);
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
