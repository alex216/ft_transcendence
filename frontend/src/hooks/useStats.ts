import { useState, useEffect } from "react";
import { api } from "../api";

export interface StatsData {
	wins: number;
	losses: number;
	total: number;
	winRate: number; // 0〜100の整数
}

export interface MatchHistory {
	id: number;
	result: "win" | "loss";
	myScore: number;
	opponentScore: number;
	opponentUserId: number;
	playedAt: string;
}

export function useStats() {
	const [stats, setStats] = useState<StatsData | null>(null);
	const [history, setHistory] = useState<MatchHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [statsRes, histRes] = await Promise.all([
					api.get<StatsData>("/stats/me"),
					api.get<MatchHistory[]>("/stats/me/match-history"),
				]);
				setStats(statsRes.data);
				setHistory(histRes.data);
			} catch {
				setError("stats.fetchFailed");
			} finally {
				setLoading(false);
			}
		};

		fetchAll();
	}, []);

	return { stats, history, loading, error };
}
