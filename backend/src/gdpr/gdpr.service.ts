import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, Equal } from "typeorm";
import { User } from "../user/user.entity";
import { Profile } from "../profile/profile.entity";
import { MatchHistory } from "../game/match-history.entity";
import { Chat } from "../chat/chat.entity";
import { Friend } from "../friend/friend.entity";
import { MailService } from "../mail/mail.service";

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

		private readonly dataSource: DataSource,
		private readonly mailService: MailService,
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

		// メールアドレスがあれば完了通知を送信
		if (user?.email) {
			await this.mailService.sendDataExportNotification(user.email, username);
		}

		return {
			exportedAt: new Date().toISOString(),
			account: user
				? {
						id: user.id,
						username: user.username,
						email: user.email ?? null,
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

	// ユーザーアカウントと関連データを削除・匿名化する
	async deleteAccount(userId: number, username: string): Promise<void> {
		// 削除前にメールアドレスを取得しておく（削除後はDBから取得できなくなるため）
		const user = await this.userRepo.findOne({ where: { id: userId } });
		const email = user?.email;

		await this.dataSource.transaction(async (manager) => {
			// MatchHistory は削除せず匿名化（他ユーザーの試合履歴を壊さないため）
			await manager
				.createQueryBuilder()
				.update("match_history")
				.set({ winnerUserId: null })
				.where("winnerUserId = :userId", { userId })
				.execute();

			await manager
				.createQueryBuilder()
				.update("match_history")
				.set({ loserUserId: null })
				.where("loserUserId = :userId", { userId })
				.execute();

			// Chat も削除せず匿名化（会話の流れを壊さないため）
			await manager
				.createQueryBuilder()
				.update("chat")
				.set({ sender: "削除済みユーザー" })
				.where("sender = :username", { username })
				.execute();

			// User を削除すると CASCADE で Profile・Friend も消える
			await manager.delete("users", { id: userId });
		});

		// 削除完了後にメール送信（メールアドレスがある場合のみ）
		if (email) {
			await this.mailService.sendAccountDeletionNotification(email, username);
		}
	}
}
