/**
 * WebSocket接続の共通設定を管理
 * HTTPクライアント(api.ts)と同じAPI_URLを使用
 */

// 環境変数からAPIのURLを取得（デフォルトはlocalhost:3000）
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Socket.IOの共通オプション
export const SOCKET_OPTIONS = {
	// 自動再接続を有効化
	reconnection: true,
	// 再接続の間隔（ミリ秒）
	reconnectionDelay: 1000,
	// 最大再接続試行回数
	reconnectionAttempts: 5,
	// タイムアウト（ミリ秒）
	timeout: 10000,
};
