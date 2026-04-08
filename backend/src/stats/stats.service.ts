import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Equal } from "typeorm";
import { MatchHistory } from "../game/match-history.entity";
import { User } from "../user/user.entity";
import type {
	StatsResponse,
	MatchHistoryEntry,
	LeaderboardEntry,
} from "../../../shared/stats.types";

@Injectable()
export class StatsService {
	constructor(
		@InjectRepository(MatchHistory)
		private readonly matchHistoryRepo: Repository<MatchHistory>,
		@InjectRepository(User)
		private readonly userRepo: Repository<User>,
	) {}

	// 勝敗統計を返す
	async getUserStats(userId: number): Promise<StatsResponse> {
		const wins = await this.matchHistoryRepo.count({
			where: { winnerUserId: userId },
		});
		const losses = await this.matchHistoryRepo.count({
			where: { loserUserId: userId },
		});
		const total = wins + losses;
		const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

		return { wins, losses, total, winRate };
	}

	// マッチ履歴一覧を返す（最新20件）
	// 対戦相手の userId に加えて username も返す
	async getMatchHistory(userId: number): Promise<MatchHistoryEntry[]> {
		const records = await this.matchHistoryRepo.find({
			where: [{ winnerUserId: Equal(userId) }, { loserUserId: Equal(userId) }],
			order: { createdAt: "DESC" },
			take: 20,
		});

		// 対戦相手のIDをまとめて収集し、1回のDBクエリで取得（N+1問題を回避）
		const opponentIds = records
			.map((r) => (r.winnerUserId === userId ? r.loserUserId : r.winnerUserId))
			.filter((id): id is number => id !== null && id !== undefined);

		const uniqueIds = [...new Set(opponentIds)];
		const users =
			uniqueIds.length > 0 ? await this.userRepo.findByIds(uniqueIds) : [];
		const userMap = new Map(users.map((u) => [u.id, u.username]));

		return records.map((r) => {
			const isWin = r.winnerUserId === userId;
			const opponentUserId = (isWin ? r.loserUserId : r.winnerUserId) ?? null;
			return {
				id: r.id,
				result: isWin ? "win" : "loss",
				myScore: isWin ? r.winnerScore : r.loserScore,
				opponentScore: isWin ? r.loserScore : r.winnerScore,
				opponentUserId,
				opponentUsername:
					opponentUserId !== null
						? (userMap.get(opponentUserId) ?? null)
						: null,
				playedAt: r.createdAt.toISOString(),
			};
		});
	}

	// 全ユーザーを勝利数順で並べたリーダーボードを返す
	async getLeaderboard(): Promise<LeaderboardEntry[]> {
		const users = await this.userRepo.find();

		const entries = await Promise.all(
			users.map(async (u) => {
				const wins = await this.matchHistoryRepo.count({
					where: { winnerUserId: u.id },
				});
				const losses = await this.matchHistoryRepo.count({
					where: { loserUserId: u.id },
				});
				const total = wins + losses;
				const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
				return { username: u.username, wins, losses, winRate };
			}),
		);

		// 勝利数降順、同数なら勝率降順
		entries.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

		return entries.map((e, i) => ({ rank: i + 1, ...e }));
	}
}
