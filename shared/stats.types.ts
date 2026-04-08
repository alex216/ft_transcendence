// 戦績・リーダーボード関連の型定義
// マイルストーン#6: 戦績表示機能

// ============================================
// API Response の型定義
// ============================================

// GET /stats/me
export interface StatsResponse {
	wins: number;
	losses: number;
	total: number;
	winRate: number; // 0〜100（%）
}

// GET /stats/me/match-history の1件分
export interface MatchHistoryEntry {
	id: number;
	result: "win" | "loss";
	myScore: number;
	opponentScore: number;
	opponentUserId: number | null;
	opponentUsername: string | null;
	playedAt: string; // ISO 8601 形式
}

// GET /stats/leaderboard の1件分
export interface LeaderboardEntry {
	rank: number;
	username: string;
	wins: number;
	losses: number;
	winRate: number; // 0〜100（%）
}
