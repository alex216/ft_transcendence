/**
 * チャット用WebSocket接続マネージャ
 * バックエンドの/chatネームスペースと通信
 */
import { io, Socket } from "socket.io-client";
import { API_URL, SOCKET_OPTIONS } from "./socketManager";
import type { ChatMessage } from "/shared/chat.interface";

// チャット用のSocket.IOクライアント（シングルトン）
let chatSocket: Socket | null = null;

/**
 * チャットソケットを取得（なければ作成）
 */
export const getChatSocket = (): Socket => {
	if (!chatSocket) {
		// /chat ネームスペースに接続
		chatSocket = io(`${API_URL}/chat`, SOCKET_OPTIONS);

		// 接続イベントのログ
		chatSocket.on("connect", () => {
			console.log("[ChatSocket] 接続成功:", chatSocket?.id);
		});

		chatSocket.on("disconnect", (reason) => {
			console.log("[ChatSocket] 切断:", reason);
		});

		chatSocket.on("connect_error", (error) => {
			console.error("[ChatSocket] 接続エラー:", error.message);
		});
	}
	return chatSocket;
};

/**
 * チャットソケットを切断
 */
export const disconnectChatSocket = (): void => {
	if (chatSocket) {
		chatSocket.disconnect();
		chatSocket = null;
		console.log("[ChatSocket] 手動切断完了");
	}
};

// ============================================
// イベント送信関数
// ============================================

/**
 * チャットルームに参加
 * @param roomId 参加するルームのID
 */
export const joinRoom = (roomId: string): void => {
	const socket = getChatSocket();
	socket.emit("joinRoom", roomId);
	console.log("[ChatSocket] ルーム参加:", roomId);
};

/**
 * メッセージを送信
 * @param message 送信するメッセージデータ
 */
export const sendMessage = (message: ChatMessage): void => {
	const socket = getChatSocket();
	socket.emit("sendMessage", message);
};

// ============================================
// イベントリスナー登録関数
// ============================================

/**
 * 過去ログを受信（ルーム参加時）
 */
export const onLoadHistory = (
	callback: (history: ChatMessage[]) => void,
): void => {
	const socket = getChatSocket();
	socket.on("loadHistory", callback);
};

/**
 * 新規メッセージを受信
 */
export const onNewMessage = (callback: (content: string) => void): void => {
	const socket = getChatSocket();
	socket.on("newMessage", callback);
};

/**
 * 全リスナーを削除
 */
export const removeAllChatListeners = (): void => {
	const socket = getChatSocket();
	socket.off("loadHistory");
	socket.off("newMessage");
};
