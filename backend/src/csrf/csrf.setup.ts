import { doubleCsrf } from "csrf-csrf";

// ============================================================
// CSRF対策: Double Submit Cookie パターン
// ============================================================
// 仕組み:
//   ① GET /auth/csrf-token を呼ぶ
//      → csrf_token Cookie がセットされる（httpOnly=false, フロントが読める）
//      → レスポンスボディに csrfToken: "xxx" が返る
//
//   ② フロントエンドはすべての POST/PUT/DELETE に
//      X-CSRF-Token: xxx ヘッダーを付ける
//
//   ③ doubleCsrfProtection ミドルウェアが
//      Cookie の csrf_token と Header の X-CSRF-Token を照合
//      → 一致すれば通過、不一致なら 403 Forbidden
//
// なぜ安全か:
//   evil.com のスクリプトは localhost の Cookie を読めない
//   （同一オリジンポリシー）
//   → X-CSRF-Token ヘッダーにトークンをセットできない → 弾かれる
// ============================================================

export const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
	// シークレット: トークンの署名に使う
	// getSecret はリクエスト時に呼ばれるため、
	// Vault からシークレットが読み込まれた後の値が使える
	getSecret: () =>
		process.env.CSRF_SECRET || "csrf-dev-secret-change-in-production",

	// セッション識別子: トークンをリクエスト元に紐付ける（v4で必須）
	// クライアントのIPアドレスを使用する
	getSessionIdentifier: (req) => req.ip ?? "",

	// csrf_token Cookie の設定
	cookieName: "csrf_token",
	cookieOptions: {
		// httpOnly: false → フロントエンドの JavaScript が Cookie を読める
		// （CSRFトークンはフロントが読む必要があるため httpOnly にできない）
		httpOnly: false,

		// SameSite=strict → 他サイトからのリクエストでは Cookie を送らない
		sameSite: "strict",

		// secure: 本番環境では HTTPS のみで Cookie を送信
		secure: process.env.NODE_ENV !== "development",
	},

	// トークンのビット長（64バイト = 十分なランダム性）
	size: 64,

	// リクエストからトークンを取り出す方法（v4では getCsrfTokenFromRequest）
	// フロントエンドは X-CSRF-Token ヘッダーにセットする
	getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"] as string,
});
