import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Pong from "@alexium216/react-pong";
import PongCanvas from "./PongCanvas";
import {
	getGameSocket,
	onUpdateState,
	onGameOver,
	movePaddle,
	disconnectGameSocket,
} from "../services/gameSocket";
import type { GameState } from "/shared/game.interface";

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

type PongSettings = {
	width: number;
	height: number;
	ballSize: number;
	paddleHeight: number;
	paddleWidth: number;
	paddleSpeed: number;
	upArrow: string;
	downArrow: string;
};

const DEFAULTS: PongSettings = {
	width: 700,
	height: 450,
	ballSize: 10,
	paddleHeight: 80,
	paddleWidth: 10,
	paddleSpeed: 7,
	upArrow: "ArrowUp",
	downArrow: "ArrowDown",
};

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

function GamePage({ mode, roomId, onBack }: GamePageProps) {
	const [s, setS] = useState<PongSettings>(DEFAULTS);

	// オンラインモード用の状態
	const [gameState, setGameState] = useState<GameState | null>(null);
	const [gameResult, setGameResult] = useState<{
		winner: string;
		isWinner: boolean;
	} | null>(null);
	const [isPlayer1, setIsPlayer1] = useState<boolean | null>(null); // 自分が左パドルかどうか（null=未確定）
	const lastSentPaddleY = useRef<number | null>(null); // 最後に送信したパドル位置（プレイヤー判定用）

	// AIモード用のprops
	const pongProps = useMemo(
		() => ({
			width: s.width,
			height: s.height,
			ballSize: s.ballSize,
			paddleHeight: s.paddleHeight,
			paddleWidth: s.paddleWidth,
			paddleSpeed: s.paddleSpeed,
			upArrow: s.upArrow,
			downArrow: s.downArrow,
		}),
		[s],
	);

	// オンラインモードのWebSocket接続
	useEffect(() => {
		if (mode !== "online") return;

		const socket = getGameSocket();

		// 接続時に自分のIDを確認して、player1かplayer2かを判定
		// 注意: バックエンドは最初にjoinQueueしたプレイヤーがp1（左パドル）
		const handleConnect = () => {
			console.log("[GamePage] WebSocket接続成功");
		};

		socket.on("connect", handleConnect);

		// ゲーム状態の更新を受信（プレイヤー判定も行う）
		const handleUpdateState = (state: GameState) => {
			setGameState(state);

			// まだプレイヤーが確定していない場合、パドルの応答で判定
			if (isPlayer1 === null && lastSentPaddleY.current !== null) {
				const tolerance = 5; // 誤差許容
				if (Math.abs(state.leftPaddleY - lastSentPaddleY.current) < tolerance) {
					console.log("[GamePage] Player 1 (左パドル) と判定");
					setIsPlayer1(true);
				} else if (
					Math.abs(state.rightPaddleY - lastSentPaddleY.current) < tolerance
				) {
					console.log("[GamePage] Player 2 (右パドル) と判定");
					setIsPlayer1(false);
				}
			}
		};
		onUpdateState(handleUpdateState);

		// ゲーム終了を受信
		const handleGameOver = (data: { winner: string }) => {
			console.log("[GamePage] ゲーム終了:", data);
			const myId = socket.id;
			setGameResult({
				winner: data.winner,
				isWinner: data.winner === myId,
			});
		};
		onGameOver(handleGameOver);

		return () => {
			socket.off("connect", handleConnect);
			socket.off("updateState", handleUpdateState);
			socket.off("gameOver", handleGameOver);
		};
	}, [mode, roomId, isPlayer1]);

	// パドル移動をサーバーに送信（プレイヤー判定用に位置を記録）
	const handlePaddleMove = useCallback((y: number) => {
		lastSentPaddleY.current = y;
		movePaddle(y);
	}, []);

	// ゲームを終了してOnlinePageに戻る
	const handleBackToOnline = () => {
		setGameState(null);
		setGameResult(null);
		disconnectGameSocket();
		onBack?.();
	};

	const title = mode === "online" ? "Online Match" : "Pong";
	const subtitle = mode === "ai" ? "Practice (AI)" : "";

	return (
		<div className="game-page">
			<header className="game-header">
				<div>
					<h2>{title}</h2>
					{subtitle && <p className="game-subtitle">{subtitle}</p>}
				</div>

				<div style={{ display: "flex", gap: 8 }}>
					{onBack && (
						<button
							type="button"
							className="btn-secondary"
							onClick={mode === "online" ? handleBackToOnline : onBack}
						>
							← Back
						</button>
					)}
					{mode === "ai" && (
						<button
							type="button"
							className="btn-primary"
							onClick={() => setS(DEFAULTS)}
						>
							Reset
						</button>
					)}
				</div>
			</header>

			<div className="game-layout">
				<section className="game-canvas-card">
					{mode === "online" ? (
						<>
							{/* オンラインモード：カスタムCanvas */}
							<PongCanvas
								gameState={gameState}
								onPaddleMove={handlePaddleMove}
								isPlayer1={isPlayer1}
								autoFocus
							/>

							{/* ゲーム結果表示 */}
							{gameResult && (
								<div
									style={{
										position: "absolute",
										top: "50%",
										left: "50%",
										transform: "translate(-50%, -50%)",
										background: "rgba(0,0,0,0.9)",
										padding: "32px 48px",
										borderRadius: "16px",
										textAlign: "center",
										zIndex: 10,
									}}
								>
									<h2
										style={{
											color: gameResult.isWinner ? "#00ff88" : "#ff4444",
											margin: 0,
										}}
									>
										{gameResult.isWinner ? "YOU WIN!" : "YOU LOSE"}
									</h2>
									<p style={{ color: "#aaa", marginTop: 8 }}>
										{gameState?.leftScore} - {gameState?.rightScore}
									</p>
									<button
										type="button"
										onClick={handleBackToOnline}
										style={{ marginTop: 16 }}
									>
										Back to Online
									</button>
								</div>
							)}
						</>
					) : (
						/* AIモード：react-pongライブラリ */
						<Pong key={JSON.stringify(pongProps)} {...pongProps} />
					)}
				</section>

				<aside className="game-side-panel">
					{mode === "ai" && (
						<>
							<h3>Settings</h3>

							<label className="slider-row">
								<div className="slider-label">Width: {s.width}</div>
								<input
									className="slider-input"
									type="range"
									min={480}
									max={980}
									step={10}
									value={s.width}
									onChange={(e) =>
										setS((p) => ({ ...p, width: Number(e.target.value) }))
									}
								/>
							</label>

							<label className="slider-row">
								<div className="slider-label">Height: {s.height}</div>
								<input
									className="slider-input"
									type="range"
									min={320}
									max={700}
									step={10}
									value={s.height}
									onChange={(e) =>
										setS((p) => ({ ...p, height: Number(e.target.value) }))
									}
								/>
							</label>

							<label className="slider-row">
								<div className="slider-label">Ball size: {s.ballSize}</div>
								<input
									className="slider-input"
									type="range"
									min={6}
									max={24}
									step={1}
									value={s.ballSize}
									onChange={(e) =>
										setS((p) => ({ ...p, ballSize: Number(e.target.value) }))
									}
								/>
							</label>

							<label className="slider-row">
								<div className="slider-label">
									Paddle height: {s.paddleHeight}
								</div>
								<input
									className="slider-input"
									type="range"
									min={40}
									max={180}
									step={5}
									value={s.paddleHeight}
									onChange={(e) =>
										setS((p) => ({
											...p,
											paddleHeight: Number(e.target.value),
										}))
									}
								/>
							</label>

							<label className="slider-row">
								<div className="slider-label">
									Paddle width: {s.paddleWidth}
								</div>
								<input
									className="slider-input"
									type="range"
									min={6}
									max={30}
									step={1}
									value={s.paddleWidth}
									onChange={(e) =>
										setS((p) => ({ ...p, paddleWidth: Number(e.target.value) }))
									}
								/>
							</label>

							<label className="slider-row">
								<div className="slider-label">
									Paddle speed: {s.paddleSpeed}
								</div>
								<input
									className="slider-input"
									type="range"
									min={2}
									max={20}
									step={1}
									value={s.paddleSpeed}
									onChange={(e) =>
										setS((p) => ({
											...p,
											paddleSpeed: clamp(Number(e.target.value), 1, 50),
										}))
									}
								/>
							</label>

							<hr />

							<h3>Controls</h3>
							<p style={{ marginTop: 0 }}>
								<code>↑ W</code> / <code>↓ S</code>
							</p>
						</>
					)}
				</aside>
			</div>
		</div>
	);
}

export default GamePage;
