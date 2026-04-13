import { useTranslation } from "react-i18next";
import { useStats } from "../hooks/useStats";

function formatDate(iso: string) {
	const d = new Date(iso);
	return d.toLocaleString();
}

export default function HistoryPage() {
	const { t } = useTranslation();
	const { history, loading, error } = useStats();

	if (loading) {
		return <div className="p-4">{t("common.loading")}</div>;
	}

	if (error) {
		return <div className="p-4">{t(error)}</div>;
	}

	return (
		<div className="p-4">
			<h2 className="mt-0">{t("history.title")}</h2>
			<p className="mt-1 text-muted">{t("history.description")}</p>

			{history.length === 0 ? (
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
							{history.map((m) => (
								<tr key={m.id}>
									<td>{formatDate(m.playedAt)}</td>
									<td>{m.opponentUsername ?? t("history.unknownOpponent")}</td>
									<td>
										<span
											className={`badge rounded-pill ${m.result === "win" ? "bg-success" : "bg-danger"}`}
										>
											{m.result === "win"
												? t("history.win")
												: t("history.lose")}
										</span>
									</td>
									<td>
										{m.myScore}-{m.opponentScore}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
