import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";

// ユーザーのオンラインステータスを管理するサービス
// ログイン/ログアウトのタイミングで users.is_online を更新する
// WebSocket接続の有無とは独立（ブラウザを閉じただけでは offline にならない）
@Injectable()
export class UserStatusService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
	) {}

	// ログイン成功時に呼び出す
	async setOnline(userId: number): Promise<void> {
		await this.userRepository.update(userId, { is_online: true });
	}

	// ログアウト時に呼び出す
	async setOffline(userId: number): Promise<void> {
		await this.userRepository.update(userId, {
			is_online: false,
			last_seen_at: new Date(),
		});
	}

	// ユーザーのオンライン状態をDBから取得
	async isOnline(userId: number): Promise<boolean> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			select: ["is_online"],
		});
		return user?.is_online ?? false;
	}
}
