/**
 * ゲーム用WebSocket接続マネージャ
 * バックエンドの/gameネームスペースと通信
 */
import { io, Socket } from "socket.io-client";
import { SOCKET_URL, SOCKET_OPTIONS } from "./socketManager";
import type { GameStateDto } from "/shared/game.interface";

// ゲーム用のSocket.IOクライアント（シングルトン）
let gameSocket: Socket | null = null;

/**
 * ゲームソケットを取得（なければ作成）
 */
export const getGameSocket = (): Socket => {
	if (!gameSocket) {
		// /game ネームスペースに接続
		gameSocket = io(`${SOCKET_URL}/game`, SOCKET_OPTIONS);

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
 * AI対戦を開始
 */
export const joinAIGame = (): void => {
	const socket = getGameSocket();
	socket.emit("joinAIGame");
	console.log("[GameSocket] AI対戦開始");
};

/**
 * パドルを上に移動（サーバーがPAD_SPEED分移動を計算）
 */
export const moveUp = (): void => {
	const socket = getGameSocket();
	socket.emit("moveUp");
};

/**
 * パドルを下に移動（サーバーがPAD_SPEED分移動を計算）
 */
export const moveDown = (): void => {
	const socket = getGameSocket();
	socket.emit("moveDown");
};

/**
 * 試合中の再接続を試みる
 */
export const reconnectGame = (roomId: string): void => {
	const socket = getGameSocket();
	socket.emit("reconnectGame", { roomId });
	console.log("[GameSocket] 再接続試行:", roomId);
};

/**
 * 降参（試合を放棄）
 */
export const surrender = (): void => {
	const socket = getGameSocket();
	socket.emit("surrender");
	console.log("[GameSocket] 降参");
};

// ============================================
// イベントリスナー登録関数
// ============================================

/**
 * ゲーム状態更新を受信（1/60秒ごと）
 */
export const onUpdateState = (callback: (dto: GameStateDto) => void): void => {
	const socket = getGameSocket();
	socket.on("updateState", callback);
};

/**
 * ゲーム終了を受信
 * winner: 勝者のsocketId（AI勝利時はnull）
 * reason: "disconnect" | "disconnectAI" | "surrender" | undefined（通常終了）
 */
export const onGameOver = (
	callback: (data: {
		winner: string | null;
		roomId: string;
		reason?: string;
	}) => void,
): void => {
	const socket = getGameSocket();
	socket.on("gameOver", callback);
};

/**
 * 対戦相手が切断した通知
 */
export const onPlayerDisconnected = (
	callback: (data: { playerSocketId: string }) => void,
): void => {
	const socket = getGameSocket();
	socket.on("playerDisconnected", callback);
};

/**
 * 対戦相手が再接続した通知
 */
export const onPlayerReconnected = (
	callback: (data: { userId: number }) => void,
): void => {
	const socket = getGameSocket();
	socket.on("playerReconnected", callback);
};

/**
 * 再接続失敗の通知
 * reason: "game_not_found" | "not_your_game" | "game_already_finished"
 */
export const onReconnectFailed = (
	callback: (data: { reason: string }) => void,
): void => {
	const socket = getGameSocket();
	socket.on("reconnectFailed", callback);
};

/**
 * 全リスナーを削除
 */
export const removeAllGameListeners = (): void => {
	const socket = getGameSocket();
	socket.off("updateState");
	socket.off("gameOver");
	socket.off("matchFound");
	socket.off("playerDisconnected");
	socket.off("playerReconnected");
	socket.off("reconnectFailed");
};
