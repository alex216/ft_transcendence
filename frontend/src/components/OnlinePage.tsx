import { useEffect, useState, useRef } from "react";
import {
	getGameSocket,
	joinQueue,
	onUpdateState,
	disconnectGameSocket,
} from "../services/gameSocket";

type OnlineStatus = "idle" | "matching" | "error";

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

export default function OnlinePage({ onStart }: OnlinePageProps) {
	const [status, setStatus] = useState<OnlineStatus>("idle");
	const [message, setMessage] = useState<string>("");
	const [isConnected, setIsConnected] = useState(false);
	// onStartの最新値を保持するref（useCallback内で古い値を参照しないため）
	const onStartRef = useRef(onStart);
	onStartRef.current = onStart;

	// WebSocket接続とマッチング検出
	useEffect(() => {
		const socket = getGameSocket();

		const handleConnect = () => {
			console.log("[OnlinePage] WebSocket接続成功");
			setIsConnected(true);
		};

		const handleDisconnect = (reason: string) => {
			console.log("[OnlinePage] WebSocket切断:", reason);
			setIsConnected(false);
		};

		// updateStateを受信 = マッチング成立 & ゲーム開始
		const handleUpdateState = () => {
			console.log("[OnlinePage] ゲーム状態受信 → 即座にゲーム画面へ遷移");
			if (onStartRef.current) {
				const roomId = `game-${Date.now()}`;
				const opponent: Opponent = { username: "対戦相手" };
				onStartRef.current({ roomId, opponent });
			}
		};

		socket.on("connect", handleConnect);
		socket.on("disconnect", handleDisconnect);
		onUpdateState(handleUpdateState);

		if (socket.connected) {
			setIsConnected(true);
		}

		return () => {
			socket.off("connect", handleConnect);
			socket.off("disconnect", handleDisconnect);
			socket.off("updateState", handleUpdateState);
		};
	}, []);

	// マッチメイキング開始
	const startMatching = () => {
		if (!isConnected) {
			setMessage("サーバーに接続されていません");
			setStatus("error");
			return;
		}

		setMessage("");
		setStatus("matching");
		joinQueue();
		console.log("[OnlinePage] マッチメイキング開始");
	};

	// マッチメイキングキャンセル
	const cancelMatching = () => {
		setMessage("マッチメイキングをキャンセルしました");
		setStatus("idle");
		disconnectGameSocket();
	};

	return (
		<div className="online-page">
			<header className="online-header">
				<div>
					<h2>Online Match</h2>
					<p className="online-subtitle">リアルタイムで他のプレイヤーと対戦</p>
				</div>
			</header>

			<div className="online-layout">
				<section className="online-card">
					<h3>Status</h3>

					<div className="online-status-row">
						<span className="online-pill">{status.toUpperCase()}</span>
						<span className="online-muted">
							WS: {isConnected ? "接続中" : "未接続"}
						</span>
					</div>

					<div className="online-desc">
						{status === "idle" && (
							<p>「Find Match」を押して対戦相手を探します。</p>
						)}
						{status === "matching" && (
							<p>マッチング中…相手が見つかると自動的にゲームが始まります。</p>
						)}
						{status === "error" && (
							<p>エラーが発生しました。Retryしてください。</p>
						)}
					</div>

					<div className="online-actions">
						{status === "idle" && (
							<button type="button" onClick={startMatching}>
								Find Match
							</button>
						)}
						{status === "matching" && (
							<button type="button" onClick={cancelMatching}>
								Cancel
							</button>
						)}
						{status === "error" && (
							<>
								<button type="button" onClick={startMatching}>
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

				<aside className="online-card online-opponent-card">
					<h3>Opponent</h3>
					<div className="online-muted">
						{status === "matching"
							? "対戦相手を探しています..."
							: "マッチング開始後に相手が表示されます"}
					</div>
				</aside>
			</div>

			<hr className="online-hr" />

			<p className="online-muted">
				WebSocket接続: {isConnected ? "✓ 接続済み" : "✗ 未接続"}
			</p>
		</div>
	);
}
