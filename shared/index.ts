// 共有型定義
// C++で言うと「ヘッダーファイル」のようなもの
// バックエンドとフロントエンドの両方から使える

// ============================================
// マイルストーン#3: ユーザー管理機能
// ============================================
export * from "./profile.types";
export * from "./friend.types";

// ============================================
// Entity（データベースのテーブルに対応）
// ============================================

export interface User {
	id: number;
	username: string;
	// パスワードログイン画面に対応しつつ、OAuthユーザー（パスワードなし）も許容する
	password?: string;

	// 【新規追加】マイルストーン6：42 OAuth用
	forty_two_id?: string;

	// 【新規追加】マイルストーン6：2FA用
	is_2fa_enabled: boolean;
	two_factor_secret?: string;

	created_at: Date; // スネークケースを維持
}

// ============================================
// API Request/Response の型定義
// ============================================

// GET /auth/me - ユーザー公開情報
// 他のAPIレスポンスでもユーザー情報を返す時はこの型を使う
export interface GetMeResponse {
	id: number;
	username: string;
}

// POST /auth/register
export interface RegisterRequest {
	username: string;
	password: string;
}

export interface RegisterResponse {
	success: boolean;
	message: string;
	user: GetMeResponse; // API定義を統一
}

// POST /auth/login
export interface LoginRequest {
	username: string;
	password: string;
}

export interface LoginResponse {
	success: boolean;
	message: string;
	user: GetMeResponse; // API定義を統一
}

// POST /auth/logout
export interface LogoutResponse {
	success: boolean;
	message: string;
}

// エラーレスポンス
export interface ErrorResponse {
	statusCode: number;
	message: string;
}
