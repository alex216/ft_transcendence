import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "https://localhost/api";

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
					axios.get<StatsData>(`${API_URL}/stats/me`, {
						withCredentials: true,
					}),
					axios.get<MatchHistory[]>(`${API_URL}/stats/me/match-history`, {
						withCredentials: true,
					}),
				]);
				setStats(statsRes.data);
				setHistory(histRes.data);
			} catch {
				setError("統計データの取得に失敗しました");
			} finally {
				setLoading(false);
			}
		};

		fetchAll();
	}, []);

	return { stats, history, loading, error };
}
