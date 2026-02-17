// プロフィール関連の型定義
// マイルストーン#3: ユーザー管理機能

// ============================================
// Entity（データベースのテーブルに対応）
// ============================================

// プロフィール情報（データベースエンティティ）
export interface UserProfile {
	id: number;
	userId: number; // users テーブルへの外部キー
	displayName?: string; // 表示名（オプション）
	bio?: string; // 自己紹介
	avatarUrl?: string; // アバター画像のURL
	createdAt: Date;
	updatedAt: Date;
}

// ============================================
// API Request/Response の型定義
// ============================================

// GET /profile/:id または GET /profile/me - プロフィール取得
export interface GetProfileResponse {
	id: number;
	username: string; // user テーブルから取得
	displayName?: string;
	bio?: string;
	avatarUrl?: string;
	createdAt: string; // ISO 8601 形式の文字列
	updatedAt: string;
}

// PUT /profile または PUT /profile/me - プロフィール更新
export interface UpdateProfileRequest {
	displayName?: string; // 最大50文字など
	bio?: string; // 最大500文字など
}

export interface UpdateProfileResponse {
	success: boolean;
	message: string;
	profile: GetProfileResponse;
}

// POST /profile/avatar - アバターアップロード
// リクエストは FormData を使用（multipart/form-data）
// フロントエンド: FormData に 'avatar' というキーでファイルを添付

export interface UploadAvatarResponse {
	success: boolean;
	message: string;
	avatarUrl: string; // アップロードされた画像のURL
}

// DELETE /profile/avatar - アバター削除
export interface DeleteAvatarResponse {
	success: boolean;
	message: string;
}
