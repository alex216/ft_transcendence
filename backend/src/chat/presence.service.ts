import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server } from "socket.io";
import { Friend } from "../friend/friend.entity";
import { UserStatusService } from "../user/user-status.service";

// ユーザーの在席状態（WebSocket接続）を追跡し、フレンドへ通知するサービス
// - socket の追加/削除
// - ブラウザを閉じた場合の自動 offline 化（grace period）
// - フレンド全員への userStatusChanged 配信
@Injectable()
export class PresenceService {
	private readonly logger = new Logger(PresenceService.name);

	// userId → 接続中の socketId セット（複数タブ対応）
	private readonly userSockets = new Map<number, Set<string>>();

	// 全 socket 切断後、この期間内に再接続があれば offline 化しない
	// ページリロードや短いネットワーク瞬断を offline 扱いにしないための猶予時間
	private static readonly OFFLINE_GRACE_PERIOD_MS = 5000;

	// WebSocket server（ChatGateway.afterInit から setServer で受け取る）
	private server: Server;

	constructor(
		private readonly userStatusService: UserStatusService,
		@InjectRepository(Friend)
		private readonly friendRepository: Repository<Friend>,
	) {}

	// ChatGateway.afterInit から Socket.IO server を受け取る
	setServer(server: Server): void {
		this.server = server;
	}

	// 接続時に呼ぶ。socket 登録 + grace period 後の再接続で offline だった場合の online 復帰
	async handleConnect(userId: number, socketId: string): Promise<void> {
		const isFirst = this.addSocket(userId, socketId);
		if (isFirst) {
			const wasOnline = await this.userStatusService.isOnline(userId);
			if (!wasOnline) {
				await this.userStatusService.setOnline(userId);
				await this.broadcastStatusToFriends(userId, true);
			}
		}
	}

	// 切断時に呼ぶ。socket 削除 + 全切断なら grace period 後に offline 化
	handleDisconnect(userId: number, socketId: string): void {
		const allGone = this.removeSocket(userId, socketId);
		if (allGone) {
			this.scheduleOffline(userId);
		}
	}

	// そのユーザーが現在 WebSocket 接続中かどうか
	isConnected(userId: number): boolean {
		return this.userSockets.has(userId);
	}

	// socket 追加。そのユーザーの最初の接続なら true を返す
	private addSocket(userId: number, socketId: string): boolean {
		const isFirst = !this.userSockets.has(userId);
		if (isFirst) {
			this.userSockets.set(userId, new Set());
		}
		this.userSockets.get(userId)!.add(socketId);
		return isFirst;
	}

	// socket 削除。全接続が切れたら true を返す
	private removeSocket(userId: number, socketId: string): boolean {
		const sockets = this.userSockets.get(userId);
		if (!sockets) return true;
		sockets.delete(socketId);
		if (sockets.size === 0) {
			this.userSockets.delete(userId);
			return true;
		}
		return false;
	}

	// 全 socket 切断後、grace period 経過後も再接続がなければ offline 化して配信
	private scheduleOffline(userId: number): void {
		setTimeout(() => {
			if (!this.isConnected(userId)) {
				void this.handleWentOffline(userId);
			}
		}, PresenceService.OFFLINE_GRACE_PERIOD_MS);
	}

	// フレンド全員に userStatusChanged イベントを配信
	async broadcastStatusToFriends(
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

	// 指定した userId 群の全 socket にイベントを配信
	emitToUsers(userIds: number[], event: string, payload: unknown): void {
		for (const uid of userIds) {
			const socketIds = this.userSockets.get(uid);
			if (!socketIds) continue;
			for (const socketId of socketIds) {
				this.server.to(socketId).emit(event, payload);
			}
		}
	}

	// grace period 満了後に呼び出す。既に offline なら冪等にスキップ
	private async handleWentOffline(userId: number): Promise<void> {
		const wasOnline = await this.userStatusService.isOnline(userId);
		if (!wasOnline) return;
		await this.userStatusService.setOffline(userId);
		await this.broadcastStatusToFriends(userId, false);
		this.logger.log(`User ${userId} went offline (grace period expired)`);
	}
}
