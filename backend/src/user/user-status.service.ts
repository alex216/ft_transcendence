import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

// ユーザーのオンラインステータスを管理するサービス
// ゲームゲートウェイとチャットゲートウェイの両方から利用される
// 同一ユーザーが複数の接続を持つ場合も正しく管理するため、
// ソケットIDのSetで接続数を追跡する
@Injectable()
export class UserStatusService {
	// userId -> 接続中のソケットIDセット
	private connections = new Map<number, Set<string>>();

	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
	) {}

	// WebSocket接続時に呼び出す
	async connect(userId: number, socketId: string): Promise<void> {
		if (!this.connections.has(userId)) {
			this.connections.set(userId, new Set());
		}
		this.connections.get(userId)!.add(socketId);

		// 初回接続時のみDBを更新（複数接続でも1回だけ）
		if (this.connections.get(userId)!.size === 1) {
			await this.userRepository.update(userId, { is_online: true });
		}
	}

	// WebSocket切断時に呼び出す
	async disconnect(userId: number, socketId: string): Promise<void> {
		const sockets = this.connections.get(userId);
		if (!sockets) return;

		sockets.delete(socketId);

		// 全接続が切れた時のみオフラインに
		if (sockets.size === 0) {
			this.connections.delete(userId);
			await this.userRepository.update(userId, {
				is_online: false,
				last_seen_at: new Date(),
			});
		}
	}

	// ユーザーのオンライン状態を取得（DB不要・メモリから即取得）
	isOnline(userId: number): boolean {
		return (this.connections.get(userId)?.size ?? 0) > 0;
	}
}
