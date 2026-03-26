import { useTranslation } from "react-i18next";

type LeaderRow = {
	rank: number;
	username: string;
	wins: number;
	losses: number;
};

const dummy: LeaderRow[] = [
	{ rank: 1, username: "alice", wins: 12, losses: 3 },
	{ rank: 2, username: "test", wins: 8, losses: 6 },
	{ rank: 3, username: "bob", wins: 5, losses: 9 },
];

function winRate(w: number, l: number) {
	const total = w + l;
	if (total === 0) return "0%";
	return `${Math.round((w / total) * 100)}%`;
}

export default function LeaderboardPage() {
	const { t } = useTranslation();

	return (
		<div style={{ padding: 24 }}>
			<h2 style={{ marginTop: 0 }}>{t("leaderboard.title")}</h2>
			<p style={{ marginTop: 4, opacity: 0.7 }}>
				{t("leaderboard.description")}
			</p>

			<div style={{ overflowX: "auto" }}>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr style={{ textAlign: "left" }}>
							<th
								style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}
							>
								{t("leaderboard.rank")}
							</th>
							<th
								style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}
							>
								{t("leaderboard.user")}
							</th>
							<th
								style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}
							>
								{t("leaderboard.wins")}
							</th>
							<th
								style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}
							>
								{t("leaderboard.losses")}
							</th>
							<th
								style={{ padding: "10px 8px", borderBottom: "1px solid #ddd" }}
							>
								{t("leaderboard.winRate")}
							</th>
						</tr>
					</thead>
					<tbody>
						{dummy.map((r) => (
							<tr key={r.rank}>
								<td
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #eee",
									}}
								>
									{r.rank}
								</td>
								<td
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #eee",
									}}
								>
									{r.username}
								</td>
								<td
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #eee",
									}}
								>
									{r.wins}
								</td>
								<td
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #eee",
									}}
								>
									{r.losses}
								</td>
								<td
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #eee",
									}}
								>
									{winRate(r.wins, r.losses)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
