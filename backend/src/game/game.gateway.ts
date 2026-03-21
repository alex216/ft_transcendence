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
import { JwtService } from "@nestjs/jwt";
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
		private readonly jwtService: JwtService, // provvisory. waiting for auth.jwt.verifytoken()
	) {}

	async handleConnection(client: AuthenticatedSocket) {
		try {
			let token: string | undefined;

			// try cookie
			const rawCookie = client.handshake.headers.cookie;
			if (rawCookie) {
				const cookies = cookie.parse(rawCookie);
				token = cookies["access_token"];
			}

			console.log("TOKEN:", token);

			if (!token) {
				console.log("No token → dummy user");
				client.data.user = { id: Math.floor(Math.random() * 1000) + 1 };
				return;
			}

			let payload: any;

			try {
				// this will have to be replaced by the auth.jwt.tokenverify()
				payload = this.jwtService.verify(token);
			} catch (err) {
				console.log("Invalid token → dummy user");
				client.data.user = { id: Math.floor(Math.random() * 1000) + 1 };
				return;
			}

			client.data.user = {
				id: payload.sub,
				username: payload.username,
			};

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
