/**
 * WebSocket接続の共通設定を管理
 * HTTPクライアント(api.ts)と同じAPI_URLを使用
 */

// 環境変数からAPIのURLを取得
// デフォルトは api.ts と同じ https://localhost/api で統一する
// (VITE_API_URL が未伝搬の場合でも CSP 準拠の URL を使うフォールバック)
const API_URL = import.meta.env.VITE_API_URL || "https://localhost/api";

// WebSocket接続用のベースURL
// REST APIは https://localhost/api だが、Socket.IOのネームスペースは /game, /chat
// なので /api を除いたオリジン（https://localhost）を使う
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

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
	// nginx経由でCookieを送信するために必要
	withCredentials: true,
};
