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
		<div className="p-4">
			<h2 className="mt-0">{t("leaderboard.title")}</h2>
			<p className="mt-1 text-muted">{t("leaderboard.description")}</p>

			<div className="table-responsive">
				<table className="table table-hover">
					<thead>
						<tr>
							<th>{t("leaderboard.rank")}</th>
							<th>{t("leaderboard.user")}</th>
							<th>{t("leaderboard.wins")}</th>
							<th>{t("leaderboard.losses")}</th>
							<th>{t("leaderboard.winRate")}</th>
						</tr>
					</thead>
					<tbody>
						{dummy.map((r) => (
							<tr key={r.rank}>
								<td>{r.rank}</td>
								<td>{r.username}</td>
								<td>{r.wins}</td>
								<td>{r.losses}</td>
								<td>{winRate(r.wins, r.losses)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
