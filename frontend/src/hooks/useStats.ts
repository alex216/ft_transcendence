import { useState, useEffect } from "react";
import { api } from "../api";
import type {
	StatsResponse,
	MatchHistoryEntry,
	LeaderboardEntry,
} from "/shared";

export type { StatsResponse, MatchHistoryEntry, LeaderboardEntry };

export function useStats() {
	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchAll = async () => {
			try {
				const [statsRes, histRes] = await Promise.all([
					api.get<StatsResponse>("/stats/me"),
					api.get<MatchHistoryEntry[]>("/stats/me/match-history"),
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

export function useLeaderboard() {
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchLeaderboard = async () => {
			try {
				const res = await api.get<LeaderboardEntry[]>("/stats/leaderboard");
				setLeaderboard(res.data);
			} catch {
				setError("leaderboard.fetchFailed");
			} finally {
				setLoading(false);
			}
		};

		fetchLeaderboard();
	}, []);

	return { leaderboard, loading, error };
}
