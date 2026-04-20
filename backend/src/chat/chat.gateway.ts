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
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChatService } from "./chat.service";
import { ChatMessage } from "../../../shared/chat.interface";
import { corsConfig } from "../cors.config";
import { UserStatusService } from "../user/user-status.service";
import { Friend } from "../friend/friend.entity";

@WebSocketGateway({
	cors: corsConfig,
	namespace: "chat", // http://localhost:3000/chat で接続
})
export class ChatGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server;

	private logger: Logger = new Logger("ChatGateway");

	// userId -> 接続中のsocket IDの集合（複数タブログインに対応）
	private userSockets = new Map<number, Set<string>>();

	// 全socket切断後、再接続を待つ猶予時間（ms）
	// ページリロードや短いネットワーク瞬断はこの期間内に自動再接続されるのでoffline化しない
	private static readonly OFFLINE_GRACE_PERIOD_MS = 5000;

	constructor(
		private readonly chatService: ChatService,
		private readonly jwtService: JwtService,
		private readonly userStatusService: UserStatusService,
		@InjectRepository(Friend)
		private readonly friendRepository: Repository<Friend>,
	) {}

	// 初期化時
	afterInit() {
		this.logger.log("WebSocket Gateway Initialized");
	}

	// クライアント接続時（JWT認証 + userId→socket マップに登録）
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
			const isFirstSocket = !this.userSockets.has(userId);
			if (isFirstSocket) {
				this.userSockets.set(userId, new Set());
			}
			this.userSockets.get(userId)!.add(client.id);

			// grace period経過後の再接続（ブラウザ再起動等でJWTは生きているがDBは既にoffline）では、
			// loginエンドポイントを経由しないのでここでonline復帰を配信する
			if (isFirstSocket) {
				const wasOnline = await this.userStatusService.isOnline(userId);
				if (!wasOnline) {
					await this.userStatusService.setOnline(userId);
					await this.broadcastStatusToFriends(userId, true);
				}
			}
		} catch {
			// 認証失敗は無視（チャットはゲストでも閲覧可能な設計）
		}
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`❌ Client disconnected: ${client.id}`);
		const userId = (client as Socket & { data?: { userId?: number } }).data
			?.userId;
		if (!userId) return;
		const sockets = this.userSockets.get(userId);
		if (!sockets) return;
		sockets.delete(client.id);
		if (sockets.size === 0) {
			this.userSockets.delete(userId);
			// grace period満了後もまだ未接続ならoffline扱いに
			// （ページリロードや瞬断で自動再接続する場合はこの間に復帰する）
			setTimeout(() => {
				if (!this.userSockets.has(userId)) {
					void this.handleUserWentOffline(userId);
				}
			}, ChatGateway.OFFLINE_GRACE_PERIOD_MS);
		}
	}

	// 全socket切断 + grace period経過後に呼び出され、
	// is_onlineをfalseに更新してフレンド全員に通知する
	// 既にoffline（明示的logoutで先に処理済み等）なら冪等にスキップ
	private async handleUserWentOffline(userId: number): Promise<void> {
		const wasOnline = await this.userStatusService.isOnline(userId);
		if (!wasOnline) return;
		await this.userStatusService.setOffline(userId);
		await this.broadcastStatusToFriends(userId, false);
	}

	// 自分の友達全員に userStatusChanged を配信する
	private async broadcastStatusToFriends(
		userId: number,
		isOnline: boolean,
	): Promise<void> {
		const relations = await this.friendRepository.find({
			where: { userId },
			select: ["friendId"],
		});
		const friendIds = relations.map((r) => r.friendId);
		if (friendIds.length === 0) return;
		this.emitToUsers(friendIds, "userStatusChanged", { userId, isOnline });
	}

	// 指定したuserId群の全socketにイベントを配信
	// プレゼンス通知など「特定ユーザーにだけ届けたい」ケースで使う
	emitToUsers(userIds: number[], event: string, payload: unknown): void {
		for (const userId of userIds) {
			const socketIds = this.userSockets.get(userId);
			if (!socketIds) continue;
			for (const socketId of socketIds) {
				this.server.to(socketId).emit(event, payload);
			}
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
