import React, { useMemo, useState } from "react";
import Pong from "@alexium216/react-pong";

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

function GamePage({ mode, roomId, opponent, onBack }: GamePageProps) {
	const [s, setS] = useState<PongSettings>(DEFAULTS);

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
		[s]
	);

	const title = mode === "online" ? "Online Match" : "Pong";
	const subtitle =
		mode === "online"
			? "（仮）Onlineモード：room参加・状態同期は後でWS連携"
			: "Practice (AI) / UIはここで調整できます";

	return (
		<div className="game-page">
			<header className="game-header">
				<div>
					<h2>{title}</h2>
					<p className="game-subtitle">{subtitle}</p>

					{mode === "online" && (
						<div style={{ marginTop: 8, opacity: 0.8 }}>
							<div>Room: {roomId ?? "-"}</div>
							<div>
								Opponent: {opponent?.username ?? "-"}{" "}
								{opponent?.pingMs != null ? `(${opponent.pingMs}ms)` : ""}
							</div>
						</div>
					)}
				</div>

				<div style={{ display: "flex", gap: 8 }}>
					{mode === "online" && onBack && (
						<button type="button" onClick={onBack}>
							Back to Online
						</button>
					)}
					<button type="button" onClick={() => setS(DEFAULTS)}>
						Reset
					</button>
				</div>
			</header>

			<div className="game-layout">
				<section className="game-canvas-card">
					{/* onlineでも今は同じPong（後でオンライン同期用に差し替える） */}
					<Pong key={JSON.stringify(pongProps)} {...pongProps} />
				</section>

				<aside className="game-side-panel">
					{mode === "ai" ? (
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
								<div className="slider-label">Paddle height: {s.paddleHeight}</div>
								<input
									className="slider-input"
									type="range"
									min={40}
									max={180}
									step={5}
									value={s.paddleHeight}
									onChange={(e) =>
										setS((p) => ({ ...p, paddleHeight: Number(e.target.value) }))
									}
								/>
							</label>

							<label className="slider-row">
								<div className="slider-label">Paddle width: {s.paddleWidth}</div>
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
								<div className="slider-label">Paddle speed: {s.paddleSpeed}</div>
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
						</>
					) : (
						<>
							<h3>Online</h3>
							<p style={{ marginTop: 0, opacity: 0.8 }}>
								※ 設定スライダーは一旦AIモードのみ（後でルールとして固定/同期する）
							</p>
							<hr />
						</>
					)}

					<h3>Controls</h3>
					<p style={{ marginTop: 0 }}>
						Up: <code>{s.upArrow}</code> / Down: <code>{s.downArrow}</code>
					</p>
					<p style={{ marginBottom: 0 }}>
						※ {mode === "online" ? "Online同期は後でWS連携" : "Practice (AI)"}
					</p>
				</aside>
			</div>
		</div>
	);
}

export default GamePage;