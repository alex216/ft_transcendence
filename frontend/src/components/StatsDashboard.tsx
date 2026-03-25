import React from "react";
import { useStats } from "../hooks/useStats";
import styles from "./StatsDashboard.module.css";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function WinRateChart({ winRate }: { winRate: number }) {
	const progress = (winRate / 100) * CIRCUMFERENCE;
	return (
		<div className={styles.chartWrapper}>
			<svg viewBox="0 0 100 100" className={styles.chart}>
				{/* 背景の円 */}
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke="#e9ecef"
					strokeWidth="10"
				/>
				{/* 進捗の円（上部から始める） */}
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke="url(#winGradient)"
					strokeWidth="10"
					strokeLinecap="round"
					strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
					transform="rotate(-90 50 50)"
				/>
				<defs>
					<linearGradient id="winGradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#667eea" />
						<stop offset="100%" stopColor="#764ba2" />
					</linearGradient>
				</defs>
			</svg>
			<div className={styles.chartLabel}>
				<span className={styles.chartValue}>{winRate}%</span>
				<span className={styles.chartSubLabel}>勝率</span>
			</div>
		</div>
	);
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function StatsDashboard() {
	const { stats, history, loading, error } = useStats();

	if (loading) {
		return <div className={styles.loading}>読み込み中...</div>;
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>統計</h2>

			{/* 上段：円グラフ + 勝敗カウンター */}
			<div className={styles.summary}>
				<WinRateChart winRate={stats?.winRate ?? 0} />

				<div className={styles.counters}>
					<div className={`${styles.counter} ${styles.counterWin}`}>
						<span className={styles.counterValue}>{stats?.wins ?? 0}</span>
						<span className={styles.counterLabel}>勝利</span>
					</div>
					<div className={`${styles.counter} ${styles.counterLoss}`}>
						<span className={styles.counterValue}>{stats?.losses ?? 0}</span>
						<span className={styles.counterLabel}>敗北</span>
					</div>
					<div className={`${styles.counter} ${styles.counterTotal}`}>
						<span className={styles.counterValue}>{stats?.total ?? 0}</span>
						<span className={styles.counterLabel}>合計</span>
					</div>
				</div>
			</div>

			{/* 下段：試合履歴テーブル */}
			<div className={styles.historySection}>
				<h3 className={styles.historyTitle}>試合履歴（最新20件）</h3>
				{history.length === 0 ? (
					<div className={styles.noHistory}>対戦履歴がまだありません</div>
				) : (
					<div className={styles.tableWrapper}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>日時</th>
									<th>結果</th>
									<th>スコア</th>
									<th>相手ID</th>
								</tr>
							</thead>
							<tbody>
								{history.map((m) => (
									<tr key={m.id}>
										<td>{formatDate(m.playedAt)}</td>
										<td>
											<span
												className={
													m.result === "win"
														? styles.badgeWin
														: styles.badgeLoss
												}
											>
												{m.result === "win" ? "勝利" : "敗北"}
											</span>
										</td>
										<td>
											{m.myScore} - {m.opponentScore}
										</td>
										<td>{m.opponentUserId}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
