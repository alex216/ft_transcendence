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
import { ChatService } from "./chat.service";
import { ChatMessage } from "../../../shared/chat.interface";

@WebSocketGateway({
	cors: {
		origin: "*", // 開発環境なので全許可。本番ではフロントのURLに制限します
	},
	namespace: "chat", // http://localhost:3000/chat で接続
})
export class ChatGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private logger: Logger = new Logger("ChatGateway");

	constructor(private readonly chatService: ChatService) {}

	// 初期化時
	afterInit() {
		this.logger.log("WebSocket Gateway Initialized");
	}

	// クライアント接続時
	handleConnection(client: Socket) {
		this.logger.log(`🚀 Client connected: ${client.id}`);
	}

	// クライアント切断時
	handleDisconnect(client: Socket) {
		this.logger.log(`❌ Client disconnected: ${client.id}`);
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
