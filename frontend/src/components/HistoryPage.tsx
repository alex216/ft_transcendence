import { useTranslation } from "react-i18next";

type MatchRow = {
	id: string;
	playedAt: string; // ISO string
	opponent: string;
	result: "WIN" | "LOSE";
	score: string; // "11-8" みたいに表示用でOK
};

const dummy: MatchRow[] = [
	{
		id: "1",
		playedAt: "2026-02-14T08:10:00Z",
		opponent: "alice",
		result: "WIN",
		score: "11-7",
	},
	{
		id: "2",
		playedAt: "2026-02-13T14:22:00Z",
		opponent: "bob",
		result: "LOSE",
		score: "8-11",
	},
];

function formatDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleString();
}

export default function HistoryPage() {
	const { t } = useTranslation();

	return (
		<div className="p-4">
			<h2 className="mt-0">{t("history.title")}</h2>
			<p className="mt-1 text-muted">{t("history.description")}</p>

			{dummy.length === 0 ? (
				<div className="p-3 border rounded">{t("history.noHistory")}</div>
			) : (
				<div className="table-responsive">
					<table className="table table-hover">
						<thead>
							<tr>
								<th>{t("history.date")}</th>
								<th>{t("history.opponent")}</th>
								<th>{t("history.result")}</th>
								<th>{t("history.score")}</th>
							</tr>
						</thead>
						<tbody>
							{dummy.map((m) => (
								<tr key={m.id}>
									<td>{formatDate(m.playedAt)}</td>
									<td>{m.opponent}</td>
									<td>
										<span
											className={`badge rounded-pill ${m.result === "WIN" ? "bg-success" : "bg-danger"}`}
										>
											{m.result === "WIN"
												? t("history.win")
												: t("history.lose")}
										</span>
									</td>
									<td>{m.score}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
