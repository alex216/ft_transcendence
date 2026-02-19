import React, { useEffect, useState } from "react";

type OnlineStatus = "idle" | "matching" | "found" | "error";

type Opponent = {
	username: string;
	elo?: number;
	pingMs?: number;
};

export type OnlineStartPayload = {
	roomId: string;
	opponent: Opponent;
};

type OnlinePageProps = {
	onStart?: (payload: OnlineStartPayload) => void;
};

function wait(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export default function OnlinePage({ onStart }: OnlinePageProps) {
	const [status, setStatus] = useState<OnlineStatus>("idle");
	const [opponent, setOpponent] = useState<Opponent | null>(null);
	const [message, setMessage] = useState<string>("");

	// UI確認用（後でWS/APIに置き換え）
	const startMatchingMock = async () => {
		setMessage("");
		setOpponent(null);
		setStatus("matching");

		await wait(1200);

		setOpponent({ username: "alice", elo: 1200, pingMs: 28 });
		setStatus("found");
	};

	const cancelMatching = () => {
		setMessage("マッチメイキングをキャンセルしました");
		setOpponent(null);
		setStatus("idle");
	};

	const startGame = () => {
		if (!opponent) {
			setMessage("相手がいません（foundになってからStartしてください）");
			return;
		}
		if (!onStart) {
			setMessage("onStart が未設定です（App側で渡してください）");
			return;
		}

		// 仮 roomId（後で backend/WS から受け取る）
		const roomId = `mock-${Date.now()}`;
		onStart({ roomId, opponent });
	};

	useEffect(() => {
		return () => {};
	}, []);

	return (
		<div className="online-page">
			<header className="online-header">
				<div>
					<h2>Online Match</h2>
					<p className="online-subtitle">
						Remote players（マッチメイキング → 対戦開始）のUIシェル（後でWS/API連携）
					</p>
				</div>
			</header>

			<div className="online-layout">
				{/* 左：状態カード */}
				<section className="online-card">
					<h3>Status</h3>

					<div className="online-status-row">
						<span className="online-pill">{status.toUpperCase()}</span>
						<span className="online-muted">WS: (mock) connected</span>
					</div>

					<div className="online-desc">
						{status === "idle" && (
							<p>「Find Match」を押して対戦相手を探します。</p>
						)}
						{status === "matching" && <p>マッチング中…（キャンセルできます）</p>}
						{status === "found" && (
							<p>相手が見つかりました。Startでゲーム開始（仮）できます。</p>
						)}
						{status === "error" && (
							<p>エラーが発生しました。Retryしてください。</p>
						)}
					</div>

					<div className="online-actions">
						{status === "idle" && (
							<button type="button" onClick={startMatchingMock}>
								Find Match
							</button>
						)}
						{status === "matching" && (
							<button type="button" onClick={cancelMatching}>
								Cancel
							</button>
						)}
						{status === "found" && (
							<>
								<button
									type="button"
									onClick={startGame}
									disabled={!onStart}
									title={!onStart ? "App側で onStart を渡してください" : ""}
								>
									Start
								</button>
								<button type="button" onClick={cancelMatching}>
									Back
								</button>
							</>
						)}
						{status === "error" && (
							<>
								<button type="button" onClick={startMatchingMock}>
									Retry
								</button>
								<button type="button" onClick={cancelMatching}>
									Back
								</button>
							</>
						)}
					</div>

					{message && <p className="online-message">{message}</p>}
				</section>

				{/* 右：相手カード */}
				<aside className="online-card online-opponent-card">
					<h3>Opponent</h3>

					{opponent ? (
						<div className="online-opponent">
							<div className="online-opponent-name">{opponent.username}</div>
							<div className="online-muted">
								ELO: {opponent.elo ?? "-"} / Ping: {opponent.pingMs ?? "-"}ms
							</div>
							<div className="online-hint">
								※ 後でアバター/ステータス/フレンド表示など追加できます
							</div>
						</div>
					) : (
						<div className="online-muted">まだ相手はいません</div>
					)}
				</aside>
			</div>

			<hr className="online-hr" />

			<p className="online-muted">
				次の接続先（予定）：WSで match queue → roomId 受領 → Gameへ遷移 → state同期
			</p>
		</div>
	);
}