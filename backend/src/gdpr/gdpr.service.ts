import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Equal } from "typeorm";
import { User } from "../user/user.entity";
import { Profile } from "../profile/profile.entity";
import { MatchHistory } from "../game/match-history.entity";
import { Chat } from "../chat/chat.entity";
import { Friend } from "../friend/friend.entity";

@Injectable()
export class GdprService {
	constructor(
		@InjectRepository(User)
		private readonly userRepo: Repository<User>,

		@InjectRepository(Profile)
		private readonly profileRepo: Repository<Profile>,

		@InjectRepository(MatchHistory)
		private readonly matchHistoryRepo: Repository<MatchHistory>,

		@InjectRepository(Chat)
		private readonly chatRepo: Repository<Chat>,

		@InjectRepository(Friend)
		private readonly friendRepo: Repository<Friend>,
	) {}

	// ユーザーの全データをまとめてエクスポートする
	async exportUserData(userId: number, username: string) {
		const [user, profile, matchHistory, chatMessages, friends] =
			await Promise.all([
				this.userRepo.findOne({ where: { id: userId } }),
				this.profileRepo.findOne({ where: { userId } }),
				this.matchHistoryRepo.find({
					where: [
						{ winnerUserId: Equal(userId) },
						{ loserUserId: Equal(userId) },
					],
					order: { createdAt: "DESC" },
				}),
				// Chat は sender（username文字列）で検索
				this.chatRepo.find({ where: { sender: username } }),
				this.friendRepo.find({ where: { userId } }),
			]);

		return {
			exportedAt: new Date().toISOString(),
			account: user
				? {
						id: user.id,
						username: user.username,
						is2faEnabled: user.is_2fa_enabled,
						createdAt: user.created_at,
					}
				: null,
			profile: profile
				? {
						displayName: profile.displayName,
						bio: profile.bio,
						avatarUrl: profile.avatarUrl,
						createdAt: profile.createdAt,
						updatedAt: profile.updatedAt,
					}
				: null,
			matchHistory: matchHistory.map((m) => ({
				id: m.id,
				result: m.winnerUserId === userId ? "win" : "loss",
				winnerScore: m.winnerScore,
				loserScore: m.loserScore,
				playedAt: m.createdAt,
			})),
			chatMessages: chatMessages.map((c) => ({
				id: c.id,
				roomId: c.roomId,
				content: c.content,
				sentAt: c.createdAt,
			})),
			friends: friends.map((f) => ({
				friendId: f.friendId,
				since: f.createdAt,
			})),
		};
	}

	// ユーザーアカウントと関連データを全て削除する
	async deleteAccount(userId: number, username: string): Promise<void> {
		// MatchHistory はユーザーIDで検索して手動削除（外部キー制約なし）
		await this.matchHistoryRepo
			.createQueryBuilder()
			.delete()
			.where("winnerUserId = :userId OR loserUserId = :userId", { userId })
			.execute();

		// Chat は sender（username）で削除
		await this.chatRepo
			.createQueryBuilder()
			.delete()
			.where("sender = :username", { username })
			.execute();

		// User を削除すると CASCADE で Profile・Friend も消える
		await this.userRepo.delete({ id: userId });
	}
}
