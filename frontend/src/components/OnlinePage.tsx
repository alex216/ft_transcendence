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
			<div className="online-layout">
				<section className="online-card">
					<h3>Status</h3>

					<div className="online-status-row">
						<span className={`online-pill ${status}`}>
							{status.toUpperCase()}
						</span>
						<div className="online-connection-status">
							<span
								className={`online-connection-dot ${isConnected ? "connected" : "disconnected"}`}
							/>
							<span className="online-muted">
								{isConnected ? "接続中" : "未接続"}
							</span>
						</div>
					</div>

					<div className="online-actions">
						{status === "idle" && (
							<button
								type="button"
								className="btn-primary"
								onClick={startMatching}
							>
								Find Match
							</button>
						)}
						{status === "matching" && (
							<button
								type="button"
								className="btn-secondary"
								onClick={cancelMatching}
							>
								Cancel
							</button>
						)}
						{status === "error" && (
							<>
								<button
									type="button"
									className="btn-primary"
									onClick={startMatching}
								>
									Retry
								</button>
								<button
									type="button"
									className="btn-secondary"
									onClick={cancelMatching}
								>
									Back
								</button>
							</>
						)}
					</div>

					{message && <p className="online-message">{message}</p>}
				</section>
			</div>
		</div>
	);
}
