import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import PongCanvas from "./PongCanvas";
import {
	getGameSocket,
	onUpdateState,
	onGameOver,
	moveUp,
	moveDown,
	joinAIGame,
	surrender,
	disconnectGameSocket,
	onPlayerDisconnected,
	onPlayerReconnected,
	onReconnectFailed,
	reconnectGame,
} from "../services/gameSocket";
import type { GameState, GameStateDto } from "/shared/game.interface";
import { AI_SOCKET_ID } from "/shared/game.constants";

export type GameMode = "ai" | "online";

export type OpponentInfo = {
	username: string;
	elo?: number;
	pingMs?: number;
};

type GamePageProps = {
	mode: GameMode; // "ai" or "online"
	roomId?: string;
	opponent?: OpponentInfo | null;
	onBack?: () => void; // Onlineへ戻る（UI導線）
};

function GamePage({ mode, roomId: initialRoomId, onBack }: GamePageProps) {
	const { t } = useTranslation();

	// ゲーム状態
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [gameResult, setGameResult] = useState<{
		winner: string | null;
		isWinner: boolean;
		reason?: string;
	} | null>(null);
	const [isPaused, setIsPaused] = useState(false);
	const [pauseMessage, setPauseMessage] = useState<string>("");

	// 再接続用にroomIdを保持
	const roomIdRef = useRef<string | null>(initialRoomId ?? null);
	// このマウントで自分のゲームが開始されたかを追跡（前のゲームのgameOverを無視するため）
	const gameStartedRef = useRef(false);
	// Added to handle victory in case of double disconnection and single reconnection
	const isPausedRef = useRef(false);

	// WebSocket接続とイベントハンドリング
	useEffect(() => {
		const socket = getGameSocket();

		const handleConnect = () => {
			console.log("[GamePage] WebSocket接続成功");
			if (mode === "online" && roomIdRef.current) {
				console.log("[GamePage] reconnectGame:", roomIdRef.current);
				reconnectGame(roomIdRef.current);
				gameStartedRef.current = true;
			}
		};
		socket.on("connect", handleConnect);

		// in case it was already connected to the mount
		if (socket.connected) {
			handleConnect();
		}

		// AI対戦の場合、接続完了後にjoinAIGameを送信
		if (mode === "ai") {
			if (socket.connected) {
				joinAIGame();
			} else {
				socket.once("connect", () => {
					joinAIGame();
				});
			}
		}

		// ゲーム状態の更新を受信
		const handleUpdateState = (dto: GameStateDto) => {
			setGameState(dto.state);
			// roomIdを保存（再接続に使用）
			roomIdRef.current = dto.roomId;
			gameStartedRef.current = true;
			// 一時停止解除
			// getting the pause situation truth from the server
			setIsPaused(dto.state.isPaused);
			isPausedRef.current = dto.state.isPaused;

			if (!dto.state.isPaused) {
				setPauseMessage("");
			} else {
				setPauseMessage(t("game.opponentDisconnected"));
			}
		};
		onUpdateState(handleUpdateState);

		// ゲーム終了を受信
		const handleGameOver = (data: {
			winner: string | null;
			roomId: string;
			reason?: string;
		}) => {
			// 前のゲームのgameOverを無視（updateStateを受信する前のgameOverは自分のゲームではない）
			if (!gameStartedRef.current) return;
			console.log("[GamePage] ゲーム終了:", data);
			const myId = socket.id;
			const isWinner =
				data.winner === myId || (mode === "ai" && data.winner !== AI_SOCKET_ID);
			setGameResult({
				winner: data.winner,
				isWinner,
				reason: data.reason,
			});
		};
		onGameOver(handleGameOver);

		// 対戦相手の切断通知
		const handlePlayerDisconnected = () => {
			console.log("[GamePage] 対戦相手が切断");
			setIsPaused(true);
			isPausedRef.current = true;
			setPauseMessage(t("game.opponentDisconnected"));
		};
		onPlayerDisconnected(handlePlayerDisconnected);

		// 対戦相手の再接続通知
		const handlePlayerReconnected = () => {
			console.log("[GamePage] 対戦相手が再接続");
			setIsPaused(false);
			isPausedRef.current = false;
			setPauseMessage("");
		};
		onPlayerReconnected(handlePlayerReconnected);

		// 再接続失敗の通知
		const handleReconnectFailed = (data: { reason: string }) => {
			console.log("[GamePage] 再接続失敗:", data.reason);
		};
		onReconnectFailed(handleReconnectFailed);

		return () => {
			socket.off("connect", handleConnect);
			socket.off("updateState", handleUpdateState);
			socket.off("gameOver", handleGameOver);
			socket.off("playerDisconnected", handlePlayerDisconnected);
			socket.off("playerReconnected", handlePlayerReconnected);
			socket.off("reconnectFailed", handleReconnectFailed);
		};
	}, [mode]);

	// パドル操作コールバック
	const handleMoveUp = useCallback(() => {
		moveUp();
	}, []);

	const handleMoveDown = useCallback(() => {
		moveDown();
	}, []);

	// 降参
	const handleSurrender = useCallback(() => {
		surrender();
	}, []);

	// ゲームを終了してOnlinePageに戻る
	const handleBackToOnline = () => {
		setGameState(null);
		setGameResult(null);
		disconnectGameSocket();
		onBack?.();
	};

	const title = mode === "online" ? t("game.onlineMatch") : t("game.pong");
	const subtitle = mode === "ai" ? t("game.practiceAI") : "";

	return (
		<div className="game-page">
			<header className="game-header">
				<div>
					<h2>{title}</h2>
					{subtitle && <p className="game-subtitle">{subtitle}</p>}
				</div>

				<div className="d-flex gap-2">
					{!gameResult && gameState && (
						<button
							type="button"
							className="btn-secondary"
							onClick={handleSurrender}
						>
							{t("game.surrender")}
						</button>
					)}
					{onBack && (
						<button
							type="button"
							className="btn-secondary"
							onClick={handleBackToOnline}
						>
							{t("game.back")}
						</button>
					)}
				</div>
			</header>

			<div className="game-layout">
				<section className="game-canvas-card">
					<PongCanvas
						gameState={gameState}
						onMoveUp={handleMoveUp}
						onMoveDown={handleMoveDown}
						isPlayer1={null}
						autoFocus
					/>

					{/* 一時停止オーバーレイ */}
					{isPaused && (
						<div
							className="position-absolute top-50 start-50 translate-middle text-center rounded-3"
							style={{
								background: "rgba(0,0,0,0.8)",
								padding: "24px 40px",
								zIndex: 10,
							}}
						>
							<h3 className="m-0" style={{ color: "#ffaa00" }}>
								{pauseMessage}
							</h3>
							<p style={{ color: "#aaa", marginTop: 8 }}>
								{t("game.waitingForReconnect")}
							</p>
						</div>
					)}

					{/* ゲーム結果表示 */}
					{gameResult && (
						<div
							className="position-absolute top-50 start-50 translate-middle text-center rounded-3"
							style={{
								background: "rgba(0,0,0,0.9)",
								padding: "32px 48px",
								zIndex: 10,
							}}
						>
							<h2
								className="m-0"
								style={{
									color: gameResult.isWinner ? "#00ff88" : "#ff4444",
								}}
							>
								{!gameResult.winner
									? t("game.nobodyWin")
									: gameResult.isWinner
										? t("game.youWin")
										: t("game.youLose")}
							</h2>
							{gameResult.reason && (
								<p style={{ color: "#888", marginTop: 4, fontSize: 14 }}>
									({gameResult.reason})
								</p>
							)}
							<p style={{ color: "#aaa", marginTop: 8 }}>
								{gameState?.leftScore} - {gameState?.rightScore}
							</p>
							<button
								type="button"
								onClick={handleBackToOnline}
								className="btn btn-secondary mt-3"
							>
								{mode === "ai" ? t("game.playAgain") : t("game.backToOnline")}
							</button>
						</div>
					)}
				</section>

				<aside className="game-side-panel">
					<h3>{t("game.controls")}</h3>
					<p className="mt-0">
						<code>↑ W</code> / <code>↓ S</code>
					</p>
				</aside>
			</div>
		</div>
	);
}

export default GamePage;
