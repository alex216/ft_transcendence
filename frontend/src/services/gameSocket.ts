/**
 * ゲーム用WebSocket接続マネージャ
 * バックエンドの/gameネームスペースと通信
 */
import { io, Socket } from "socket.io-client";
import { API_URL, SOCKET_OPTIONS } from "./socketManager";
import type { GameState, PaddleMoveDto } from "/shared/game.interface";

// ゲーム用のSocket.IOクライアント（シングルトン）
let gameSocket: Socket | null = null;

/**
 * ゲームソケットを取得（なければ作成）
 */
export const getGameSocket = (): Socket => {
	if (!gameSocket) {
		// /game ネームスペースに接続
		gameSocket = io(`${API_URL}/game`, SOCKET_OPTIONS);

		// 接続イベントのログ
		gameSocket.on("connect", () => {
			console.log("[GameSocket] 接続成功:", gameSocket?.id);
		});

		gameSocket.on("disconnect", (reason) => {
			console.log("[GameSocket] 切断:", reason);
		});

		gameSocket.on("connect_error", (error) => {
			console.error("[GameSocket] 接続エラー:", error.message);
		});
	}
	return gameSocket;
};

/**
 * ゲームソケットを切断
 */
export const disconnectGameSocket = (): void => {
	if (gameSocket) {
		gameSocket.disconnect();
		gameSocket = null;
		console.log("[GameSocket] 手動切断完了");
	}
};

// ============================================
// イベント送信関数
// ============================================

/**
 * マッチメイキングキューに参加
 */
export const joinQueue = (): void => {
	const socket = getGameSocket();
	socket.emit("joinQueue");
	console.log("[GameSocket] キューに参加");
};

/**
 * パドルの位置を送信
 * @param y パドルのY座標（0〜500の範囲推奨）
 */
export const movePaddle = (y: number): void => {
	const socket = getGameSocket();
	const payload: PaddleMoveDto = { y };
	socket.emit("movePaddle", payload);
};

// ============================================
// イベントリスナー登録関数
// ============================================

/**
 * ゲーム状態更新を受信（1/60秒ごと）
 */
export const onUpdateState = (callback: (state: GameState) => void): void => {
	const socket = getGameSocket();
	socket.on("updateState", callback);
};

/**
 * ゲーム終了を受信
 */
export const onGameOver = (
	callback: (data: { winner: string }) => void,
): void => {
	const socket = getGameSocket();
	socket.on("gameOver", callback);
};

/**
 * マッチング成功を受信（ゲーム開始）
 */
export const onMatchFound = (
	callback: (data: { roomId: string; opponent: string }) => void,
): void => {
	const socket = getGameSocket();
	socket.on("matchFound", callback);
};

/**
 * 全リスナーを削除
 */
export const removeAllGameListeners = (): void => {
	const socket = getGameSocket();
	socket.off("updateState");
	socket.off("gameOver");
	socket.off("matchFound");
};
