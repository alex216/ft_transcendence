import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	OnGatewayInit,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { parse } from "cookie";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";
import { PresenceService } from "./presence.service";
import { ChatMessage } from "../../../shared/chat.interface";
import { corsConfig } from "../cors.config";

@WebSocketGateway({
	cors: corsConfig,
	namespace: "chat",
})
export class ChatGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(ChatGateway.name);

	constructor(
		private readonly chatService: ChatService,
		private readonly jwtService: JwtService,
		private readonly presenceService: PresenceService,
	) {}

	// 初期化時に WebSocket server を PresenceService に渡す
	afterInit(server: Server) {
		this.presenceService.setServer(server);
		this.logger.log("WebSocket Gateway Initialized");
	}

	// 接続時：JWT 認証 → userId を client.data に保存 → PresenceService に委譲
	async handleConnection(client: Socket) {
		this.logger.log(`🚀 Client connected: ${client.id}`);
		try {
			const token = parse(client.handshake.headers.cookie ?? "")[
				"access_token"
			];
			if (!token) return;

			const payload = this.jwtService.verify<{ sub: number }>(token);
			const userId = payload.sub;
			(client as Socket & { data: { userId?: number } }).data = { userId };

			await this.presenceService.handleConnect(userId, client.id);
		} catch {
			// 認証失敗は無視（チャットはゲストでも閲覧可能な設計）
		}
	}

	// 切断時：userId を取得 → PresenceService に委譲
	handleDisconnect(client: Socket) {
		this.logger.log(`❌ Client disconnected: ${client.id}`);
		const userId = (client as Socket & { data?: { userId?: number } }).data
			?.userId;
		if (!userId) return;

		this.presenceService.handleDisconnect(userId, client.id);
	}

	@SubscribeMessage("joinRoom")
	async handleJoinRoom(client: Socket, roomId: string) {
		client.join(roomId);
		this.logger.log(`👤 Client ${client.id} joined room: ${roomId}`);
		const history = await this.chatService.getMessagesByRoom(roomId);
		client.emit("loadHistory", history);
	}

	@SubscribeMessage("sendMessage")
	async handleMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: ChatMessage,
	) {
		if (!payload || !payload.roomId || !payload.content) {
			this.logger.warn(`Invalid message payload from ${client.id}`);
			return;
		}
		this.logger.log(
			`📩 Message from ${client.id} in room ${payload.roomId}: ${payload.content}`,
		);
		await this.chatService.saveMessage(payload);
		client.to(payload.roomId).emit("newMessage", payload.content);
	}
}
