import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GameState } from "/shared/game.interface";
import {
	FIELD_WIDTH,
	FIELD_HEIGHT,
	PAD_WIDTH,
	PAD_LENGTH,
	PAD_BORDER_DIST,
} from "/shared/game.constants";

// 表示用の定数
const MAX_DISPLAY_WIDTH = 640; // 表示上の最大幅
const BALL_RADIUS = 10;

// パドルのX座標（shared定数から算出）
const LEFT_PADDLE_X = PAD_BORDER_DIST;
const RIGHT_PADDLE_X = FIELD_WIDTH - PAD_BORDER_DIST;

type PongCanvasProps = {
	gameState: GameState | null;
	onMoveUp: () => void;
	onMoveDown: () => void;
	isPlayer1: boolean | null; // true: 左パドル, false: 右パドル, null: 未確定（両方白）
	autoFocus?: boolean; // ゲーム開始時に自動フォーカス
};

/**
 * サーバーから受信したGameStateを描画するCanvas
 * 自前の物理演算は行わず、サーバーの状態をそのまま表示
 * Canvas要素にフォーカスがあるときのみキー入力を受け付ける
 */
export default function PongCanvas({
	gameState,
	onMoveUp,
	onMoveDown,
	isPlayer1,
	autoFocus = false,
}: PongCanvasProps) {
	const { t } = useTranslation();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const keysPressed = useRef<Set<string>>(new Set()); // 押されているキーを追跡
	const hasAutoFocused = useRef(false); // 自動フォーカス済みかどうか
	const [isFocused, setIsFocused] = useState(false);
	const [scale, setScale] = useState(1);

	// コンテナサイズに基づいてスケールを計算
	useEffect(() => {
		const updateScale = () => {
			const container = containerRef.current;
			if (!container) return;

			// 親要素の幅とMAX_DISPLAY_WIDTHの小さい方を使用
			const availableWidth = Math.min(
				container.parentElement?.clientWidth ?? MAX_DISPLAY_WIDTH,
				MAX_DISPLAY_WIDTH,
			);
			const newScale = Math.min(1, availableWidth / FIELD_WIDTH);
			setScale(newScale);
		};

		updateScale();
		window.addEventListener("resize", updateScale);
		return () => window.removeEventListener("resize", updateScale);
	}, []);

	// autoFocusが有効でgameStateが最初に設定されたらCanvasに自動フォーカス（1回のみ）
	useEffect(() => {
		if (
			autoFocus &&
			gameState &&
			canvasRef.current &&
			!hasAutoFocused.current
		) {
			canvasRef.current.focus();
			hasAutoFocused.current = true;
		}
	}, [autoFocus, gameState]);

	// Canvasがフォーカスを持っているとき、ページスクロールを防止
	useEffect(() => {
		const preventScroll = (e: KeyboardEvent) => {
			if (isFocused && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
				e.preventDefault();
			}
		};

		window.addEventListener("keydown", preventScroll);
		return () => window.removeEventListener("keydown", preventScroll);
	}, [isFocused]);

	// キー押下時: キーをSetに追加（リピートイベントは無視）
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLCanvasElement>) => {
			if (e.repeat) return;
			const validKeys = ["ArrowUp", "ArrowDown", "w", "W", "s", "S"];
			if (validKeys.includes(e.key)) {
				e.preventDefault();
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

	// 毎フレームでキー状態をチェックしてmoveUp/moveDownをサーバーに送信（フォーカス時のみ）
	useEffect(() => {
		if (!isFocused) return;

		let animationId: number;

		const gameLoop = () => {
			const keys = keysPressed.current;

			if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
				onMoveUp();
			}
			if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
				onMoveDown();
			}

			animationId = requestAnimationFrame(gameLoop);
		};

		animationId = requestAnimationFrame(gameLoop);
		return () => cancelAnimationFrame(animationId);
	}, [isFocused, onMoveUp, onMoveDown]);

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
		ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

		if (!gameState) {
			// ゲーム状態がない場合は待機メッセージ
			ctx.fillStyle = "#ffffff";
			ctx.font = "24px Arial";
			ctx.textAlign = "center";
			ctx.fillText(t("game.waitingForGame"), FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
			return;
		}

		// 中央線（点線）
		ctx.setLineDash([10, 10]);
		ctx.strokeStyle = "#4a4a6a";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(FIELD_WIDTH / 2, 0);
		ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
		ctx.stroke();
		ctx.setLineDash([]);

		// スコア表示
		ctx.fillStyle = "#ffffff";
		ctx.font = "48px Arial";
		ctx.textAlign = "center";
		ctx.fillText(String(gameState.leftScore), FIELD_WIDTH / 4, 60);
		ctx.fillText(String(gameState.rightScore), (FIELD_WIDTH * 3) / 4, 60);

		// 左パドル（isPlayer1 === true の時だけ緑、null/false は白）
		ctx.fillStyle = isPlayer1 === true ? "#00ff88" : "#ffffff";
		ctx.fillRect(LEFT_PADDLE_X, gameState.leftPaddleY, PAD_WIDTH, PAD_LENGTH);

		// 右パドル（isPlayer1 === false の時だけ緑、null/true は白）
		ctx.fillStyle = isPlayer1 === false ? "#00ff88" : "#ffffff";
		ctx.fillRect(RIGHT_PADDLE_X, gameState.rightPaddleY, PAD_WIDTH, PAD_LENGTH);

		// ボール
		ctx.fillStyle = "#ffff00";
		ctx.beginPath();
		ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	}, [gameState, isPlayer1]);

	// スケーリング後の表示サイズを計算
	const displayWidth = FIELD_WIDTH * scale;
	const displayHeight = FIELD_HEIGHT * scale;

	return (
		<div
			ref={containerRef}
			style={{
				position: "relative",
				width: displayWidth,
				height: displayHeight,
				overflow: "hidden",
			}}
		>
			<canvas
				ref={canvasRef}
				width={FIELD_WIDTH}
				height={FIELD_HEIGHT}
				style={{
					display: "block",
					border: isFocused ? "2px solid #00ff88" : "2px solid #4a4a6a",
					borderRadius: "8px",
					background: "#1a1a2e",
					outline: "none",
					cursor: "pointer",
					transformOrigin: "top left",
					transform: `scale(${scale})`,
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
						bottom: 10 * scale,
						left: "50%",
						transform: "translateX(-50%)",
						background: "rgba(0,0,0,0.7)",
						color: "#aaa",
						padding: "4px 12px",
						borderRadius: "4px",
						fontSize: `${14 * scale}px`,
						pointerEvents: "none",
					}}
				>
					{t("game.clickToStart")}
				</div>
			)}
		</div>
	);
}
