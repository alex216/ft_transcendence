import React from "react";
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
		<div style={{ padding: 24 }}>
			<h2 style={{ marginTop: 0 }}>{t("history.title")}</h2>
			<p style={{ marginTop: 4, opacity: 0.7 }}>{t("history.description")}</p>

			{dummy.length === 0 ? (
				<div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
					{t("history.noHistory")}
				</div>
			) : (
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ textAlign: "left" }}>
								<th
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #ddd",
									}}
								>
									{t("history.date")}
								</th>
								<th
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #ddd",
									}}
								>
									{t("history.opponent")}
								</th>
								<th
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #ddd",
									}}
								>
									{t("history.result")}
								</th>
								<th
									style={{
										padding: "10px 8px",
										borderBottom: "1px solid #ddd",
									}}
								>
									{t("history.score")}
								</th>
							</tr>
						</thead>
						<tbody>
							{dummy.map((m) => (
								<tr key={m.id}>
									<td
										style={{
											padding: "10px 8px",
											borderBottom: "1px solid #eee",
										}}
									>
										{formatDate(m.playedAt)}
									</td>
									<td
										style={{
											padding: "10px 8px",
											borderBottom: "1px solid #eee",
										}}
									>
										{m.opponent}
									</td>
									<td
										style={{
											padding: "10px 8px",
											borderBottom: "1px solid #eee",
										}}
									>
										<span
											style={{
												padding: "2px 8px",
												borderRadius: 999,
												border: "1px solid #ddd",
												fontWeight: 600,
											}}
										>
											{m.result === "WIN"
												? t("history.win")
												: t("history.lose")}
										</span>
									</td>
									<td
										style={{
											padding: "10px 8px",
											borderBottom: "1px solid #eee",
										}}
									>
										{m.score}
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
