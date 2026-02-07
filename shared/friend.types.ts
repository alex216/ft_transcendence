// フレンドシステム関連の型定義
// マイルストーン#3: ユーザー管理機能

import { GetProfileResponse } from "./profile.types";

// ============================================
// Enum（列挙型）
// ============================================

// フレンドリクエストのステータス
export enum FriendRequestStatus {
	PENDING = "pending", // 保留中
	ACCEPTED = "accepted", // 承認済み
	REJECTED = "rejected", // 拒否済み
}

// ============================================
// Entity（データベースのテーブルに対応）
// ============================================

// フレンドリクエスト（friend_requests テーブル）
export interface FriendRequest {
	id: number;
	senderId: number; // リクエスト送信者のユーザーID
	receiverId: number; // リクエスト受信者のユーザーID
	status: FriendRequestStatus;
	createdAt: Date;
	updatedAt: Date;
}

// フレンド関係（friends テーブル）
// user_id と friend_id の組み合わせで双方向の関係を表現
export interface Friend {
	id: number;
	userId: number; // ユーザーID
	friendId: number; // フレンドのユーザーID
	createdAt: Date;
}

// ============================================
// API Request/Response の型定義
// ============================================

// POST /friends/request - フレンドリクエスト送信
export interface SendFriendRequestRequest {
	receiverId?: number; // 受信者のユーザーID
	username?: string; // または受信者のユーザー名
	// どちらか一方を指定（バックエンドで両方をサポート）
}

export interface SendFriendRequestResponse {
	success: boolean;
	message: string;
	friendRequest: {
		id: number;
		senderId: number;
		receiverId: number;
		status: FriendRequestStatus;
		createdAt: string;
	};
}

// POST /friends/accept/:requestId - フレンドリクエスト承認
export interface AcceptFriendRequestResponse {
	success: boolean;
	message: string;
}

// POST /friends/reject/:requestId - フレンドリクエスト拒否
export interface RejectFriendRequestResponse {
	success: boolean;
	message: string;
}

// DELETE /friends/:friendId - フレンド削除
export interface RemoveFriendResponse {
	success: boolean;
	message: string;
}

// GET /friends - 自分のフレンドリスト取得
export interface GetFriendsResponse {
	friends: Array<{
		id: number; // friend テーブルのID
		userId: number;
		friendId: number;
		createdAt: string;
		friend: GetProfileResponse; // フレンドのプロフィール情報
	}>;
}

// GET /friends/requests - フレンドリクエスト一覧取得
export interface GetFriendRequestsResponse {
	sent: Array<{
		// 自分が送信したリクエスト
		id: number;
		receiverId: number;
		status: FriendRequestStatus;
		createdAt: string;
		receiver: GetProfileResponse; // 受信者のプロフィール情報
	}>;
	received: Array<{
		// 自分が受信したリクエスト
		id: number;
		senderId: number;
		status: FriendRequestStatus;
		createdAt: string;
		sender: GetProfileResponse; // 送信者のプロフィール情報
	}>;
}

// GET /friends/status/:userId - 特定ユーザーとのフレンド状態を取得
export interface GetFriendStatusResponse {
	isFriend: boolean; // 既にフレンドかどうか
	requestStatus?: FriendRequestStatus; // リクエストがある場合のステータス
	requestId?: number; // リクエストID（承認/拒否時に使用）
	isSender?: boolean; // 自分が送信者かどうか
}
