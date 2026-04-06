// CORS設定（HTTP・WebSocket共通）
// フロントエンドのURLのみ許可し、それ以外のオリジンからのリクエストを拒否する
export const corsConfig = {
	origin: process.env.FRONTEND_URL || "http://localhost:3001",
	credentials: true,
};
