import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Equal } from "typeorm";
import { MatchHistory } from "../game/match-history.entity";

export interface UserStatsResult {
	wins: number;
	losses: number;
	total: number;
	winRate: number; // 0〜100（%）
}

export interface MatchHistoryEntry {
	id: number;
	result: "win" | "loss";
	myScore: number;
	opponentScore: number;
	opponentUserId: number;
	playedAt: Date;
}

@Injectable()
export class StatsService {
	constructor(
		@InjectRepository(MatchHistory)
		private readonly matchHistoryRepo: Repository<MatchHistory>,
	) {}

	// 勝敗統計を返す
	async getUserStats(userId: number): Promise<UserStatsResult> {
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
	async getMatchHistory(userId: number): Promise<MatchHistoryEntry[]> {
		const records = await this.matchHistoryRepo.find({
			where: [{ winnerUserId: Equal(userId) }, { loserUserId: Equal(userId) }],
			order: { createdAt: "DESC" },
			take: 20,
		});

		return records.map((r) => {
			const isWin = r.winnerUserId === userId;
			return {
				id: r.id,
				result: isWin ? "win" : "loss",
				myScore: isWin ? r.winnerScore : r.loserScore,
				opponentScore: isWin ? r.loserScore : r.winnerScore,
				opponentUserId: isWin ? r.loserUserId : r.winnerUserId,
				playedAt: r.createdAt,
			};
		});
	}
}
