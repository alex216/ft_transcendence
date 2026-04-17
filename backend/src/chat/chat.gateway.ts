import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	OnGatewayInit,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Socket } from "socket.io";
import { parse } from "cookie";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";
import { UserStatusService } from "../user/user-status.service";
import { ChatMessage } from "../../../shared/chat.interface";
import { corsConfig } from "../cors.config";

@WebSocketGateway({
	cors: corsConfig,
	namespace: "chat", // http://localhost:3000/chat で接続
})
export class ChatGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private logger: Logger = new Logger("ChatGateway");

	constructor(
		private readonly chatService: ChatService,
		private readonly userStatusService: UserStatusService,
		private readonly jwtService: JwtService,
	) {}

	// 初期化時
	afterInit() {
		this.logger.log("WebSocket Gateway Initialized");
	}

	// クライアント接続時（JWT認証 + オンラインステータス更新）
	async handleConnection(client: Socket) {
		this.logger.log(`🚀 Client connected: ${client.id}`);
		try {
			const token = parse(client.handshake.headers.cookie ?? "")[
				"access_token"
			];
			if (token) {
				const payload = this.jwtService.verify<{ sub: number }>(token);
				(client as Socket & { data: { userId?: number } }).data = {
					userId: payload.sub,
				};
				await this.userStatusService.connect(payload.sub, client.id);
			}
		} catch {
			// 認証失敗は無視（チャットはゲストでも閲覧可能な設計）
		}
	}

	// クライアント切断時（オンラインステータス更新）
	handleDisconnect(client: Socket) {
		this.logger.log(`❌ Client disconnected: ${client.id}`);
		const userId = (client as Socket & { data?: { userId?: number } }).data
			?.userId;
		if (userId) {
			void this.userStatusService.disconnect(userId, client.id);
		}
	}

	// 部屋に参加する（動作確認用に便利）
	@SubscribeMessage("joinRoom")
	async handleJoinRoom(client: Socket, roomId: string) {
		client.join(roomId);
		this.logger.log(`👤 Client ${client.id} joined room: ${roomId}`);

		// ★追加：この部屋の過去ログをDBから取ってくる
		const history = await this.chatService.getMessagesByRoom(roomId);

		// ★追加：入室した本人にだけ、過去ログを送信する
		client.emit("loadHistory", history);
	}

	// メッセージ受信時
	@SubscribeMessage("sendMessage")
	async handleMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() payload: ChatMessage, //
	) {
		if (!payload || !payload.roomId || !payload.content) {
			this.logger.warn(`Invalid message payload from ${client.id}`);
			return;
		}

		this.logger.log(
			`📩 Message from ${client.id} in room ${payload.roomId}: ${payload.content}`,
		);

		// ルーム機能（あとで実装）を使わない場合は、とりあえず全員にブロードキャスト
		// client.broadcast.emit('newMessage', payload.content);

		// ★この1行を追加！ データベースに保存する
		await this.chatService.saveMessage(payload);

		// 特定の部屋にいる人（自分以外）に送る場合
		client.to(payload.roomId).emit("newMessage", payload.content);
	}
}
