import { useEffect, useRef, useCallback, useState } from "react";
import type { GameState } from "/shared/game.interface";

// バックエンドと同じ定数（game.service.ts参照）
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;

// パドル位置（バックエンドの衝突判定に合わせる）
const LEFT_PADDLE_X = 40;
const RIGHT_PADDLE_X = 740;

type PongCanvasProps = {
	gameState: GameState | null;
	onPaddleMove: (y: number) => void;
	isPlayer1: boolean | null; // true: 左パドル, false: 右パドル, null: 未確定（両方白）
};

/**
 * サーバーから受信したGameStateを描画するCanvas
 * 自前の物理演算は行わず、サーバーの状態をそのまま表示
 * Canvas要素にフォーカスがあるときのみキー入力を受け付ける
 */
export default function PongCanvas({
	gameState,
	onPaddleMove,
	isPlayer1,
}: PongCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const paddleYRef = useRef<number>(250); // 自分のパドルY座標（送信用）
	const keysPressed = useRef<Set<string>>(new Set()); // 押されているキーを追跡
	const [isFocused, setIsFocused] = useState(false);

	// キー押下時: キーをSetに追加（リピートイベントは無視）
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLCanvasElement>) => {
			if (e.repeat) return; // OSのキーリピートは無視
			const validKeys = ["ArrowUp", "ArrowDown", "w", "W", "s", "S"];
			if (validKeys.includes(e.key)) {
				e.preventDefault(); // ページスクロールを防止
				keysPressed.current.add(e.key);
			}
		},
		[],
	);

	// キー離し時: キーをSetから削除
	const handleKeyUp = useCallback(
		(e: React.KeyboardEvent<HTMLCanvasElement>) => {
			keysPressed.current.delete(e.key);
		},
		[],
	);

	// 毎フレームでキー状態をチェックしてパドルを移動（フォーカス時のみ）
	useEffect(() => {
		if (!isFocused) return;

		let animationId: number;
		const moveSpeed = 8; // フレームあたりの移動量

		const gameLoop = () => {
			const keys = keysPressed.current;
			let newY = paddleYRef.current;

			if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
				newY = Math.max(0, newY - moveSpeed);
			}
			if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
				newY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newY + moveSpeed);
			}

			if (newY !== paddleYRef.current) {
				paddleYRef.current = newY;
				onPaddleMove(newY);
			}

			animationId = requestAnimationFrame(gameLoop);
		};

		animationId = requestAnimationFrame(gameLoop);
		return () => cancelAnimationFrame(animationId);
	}, [isFocused, onPaddleMove]);

	// Canvas要素をクリックしたら自動的にフォーカス
	const handleClick = useCallback(() => {
		canvasRef.current?.focus();
	}, []);

	// ゲーム状態が更新されたら描画
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// 背景をクリア（黒）
		ctx.fillStyle = "#1a1a2e";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

		if (!gameState) {
			// ゲーム状態がない場合は待機メッセージ
			ctx.fillStyle = "#ffffff";
			ctx.font = "24px Arial";
			ctx.textAlign = "center";
			ctx.fillText(
				"ゲーム開始を待っています...",
				CANVAS_WIDTH / 2,
				CANVAS_HEIGHT / 2,
			);
			return;
		}

		// 中央線（点線）
		ctx.setLineDash([10, 10]);
		ctx.strokeStyle = "#4a4a6a";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(CANVAS_WIDTH / 2, 0);
		ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
		ctx.stroke();
		ctx.setLineDash([]);

		// スコア表示
		ctx.fillStyle = "#ffffff";
		ctx.font = "48px Arial";
		ctx.textAlign = "center";
		ctx.fillText(String(gameState.leftScore), CANVAS_WIDTH / 4, 60);
		ctx.fillText(String(gameState.rightScore), (CANVAS_WIDTH * 3) / 4, 60);

		// 左パドル（isPlayer1 === true の時だけ緑、null/false は白）
		ctx.fillStyle = isPlayer1 === true ? "#00ff88" : "#ffffff";
		ctx.fillRect(
			LEFT_PADDLE_X,
			gameState.leftPaddleY,
			PADDLE_WIDTH,
			PADDLE_HEIGHT,
		);

		// 右パドル（isPlayer1 === false の時だけ緑、null/true は白）
		ctx.fillStyle = isPlayer1 === false ? "#00ff88" : "#ffffff";
		ctx.fillRect(
			RIGHT_PADDLE_X,
			gameState.rightPaddleY,
			PADDLE_WIDTH,
			PADDLE_HEIGHT,
		);

		// ボール
		ctx.fillStyle = "#ffff00";
		ctx.beginPath();
		ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();

		// 自分のパドル位置を同期（確定後のみ）
		if (isPlayer1 !== null) {
			const myPaddleY = isPlayer1
				? gameState.leftPaddleY
				: gameState.rightPaddleY;
			paddleYRef.current = myPaddleY;
		}
	}, [gameState, isPlayer1]);

	return (
		<div style={{ position: "relative" }}>
			<canvas
				ref={canvasRef}
				width={CANVAS_WIDTH}
				height={CANVAS_HEIGHT}
				style={{
					display: "block",
					border: isFocused ? "2px solid #00ff88" : "2px solid #4a4a6a",
					borderRadius: "8px",
					background: "#1a1a2e",
					outline: "none",
					cursor: "pointer",
				}}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				onClick={handleClick}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
			/>
			{/* フォーカスのヒント表示 */}
			{!isFocused && (
				<div
					style={{
						position: "absolute",
						bottom: 10,
						left: "50%",
						transform: "translateX(-50%)",
						background: "rgba(0,0,0,0.7)",
						color: "#aaa",
						padding: "4px 12px",
						borderRadius: "4px",
						fontSize: "14px",
						pointerEvents: "none",
					}}
				>
					クリックして操作を開始
				</div>
			)}
		</div>
	);
}
