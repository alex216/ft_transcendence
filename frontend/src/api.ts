import axios from "axios";
import type {
	RegisterRequest,
	RegisterResponse,
	LoginRequest,
	LoginResponse,
	GetMeResponse,
	LogoutResponse,
	GetProfileResponse,
	UpdateProfileRequest,
	UpdateProfileResponse,
	UploadAvatarResponse,
	DeleteAvatarResponse,
	SendFriendRequestRequest,
	SendFriendRequestResponse,
	AcceptFriendRequestResponse,
	RejectFriendRequestResponse,
	RemoveFriendResponse,
	GetFriendsResponse,
	GetFriendRequestsResponse,
	GetFriendStatusResponse,
} from "/shared";

// バックエンドAPIとの通信を担当
// C++で言うと「HTTPクライアント」のようなもの
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

// axiosの設定（クッキーを送信するために必要）
const api = axios.create({
	baseURL: API_URL,
	withCredentials: true, // セッションクッキーを含める
});

// ユーザー登録
export const register = async (
	username: string,
	password: string,
): Promise<RegisterResponse> => {
	const requestBody: RegisterRequest = { username, password };
	const response = await api.post<RegisterResponse>(
		"/auth/register",
		requestBody,
	);
	return response.data;
};

// ログイン
export const login = async (
	username: string,
	password: string,
): Promise<LoginResponse> => {
	const requestBody: LoginRequest = { username, password };
	const response = await api.post<LoginResponse>("/auth/login", requestBody);
	return response.data;
};

// 現在のユーザー情報取得
export const getCurrentUser = async (): Promise<GetMeResponse> => {
	const response = await api.get<GetMeResponse>("/auth/me");
	return response.data;
};

// ログアウト
export const logout = async (): Promise<LogoutResponse> => {
	const response = await api.post<LogoutResponse>("/auth/logout");
	return response.data;
};

// ============================================
// Profile API（プロフィール関連）
// ============================================

// 自分のプロフィール取得
export const getMyProfile = async (): Promise<GetProfileResponse> => {
	const response = await api.get<GetProfileResponse>("/profile/me");
	return response.data;
};

// 他のユーザーのプロフィール取得
export const getProfile = async (
	userId: number,
): Promise<GetProfileResponse> => {
	const response = await api.get<GetProfileResponse>(`/profile/${userId}`);
	return response.data;
};

// プロフィール更新
export const updateProfile = async (
	data: UpdateProfileRequest,
): Promise<UpdateProfileResponse> => {
	const response = await api.put<UpdateProfileResponse>("/profile/me", data);
	return response.data;
};

// アバターアップロード
export const uploadAvatar = async (
	file: File,
): Promise<UploadAvatarResponse> => {
	const formData = new FormData();
	formData.append("avatar", file);
	const response = await api.post<UploadAvatarResponse>(
		"/profile/avatar",
		formData,
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		},
	);
	return response.data;
};

// アバター削除
export const deleteAvatar = async (): Promise<DeleteAvatarResponse> => {
	const response = await api.delete<DeleteAvatarResponse>("/profile/avatar");
	return response.data;
};

// ============================================
// Friend API（フレンド関連）
// ============================================

// フレンドリクエスト送信
export const sendFriendRequest = async (
	data: SendFriendRequestRequest,
): Promise<SendFriendRequestResponse> => {
	const response = await api.post<SendFriendRequestResponse>(
		"/friends/request",
		data,
	);
	return response.data;
};

// フレンドリクエスト承認
export const acceptFriendRequest = async (
	requestId: number,
): Promise<AcceptFriendRequestResponse> => {
	const response = await api.post<AcceptFriendRequestResponse>(
		`/friends/accept/${requestId}`,
	);
	return response.data;
};

// フレンドリクエスト拒否
export const rejectFriendRequest = async (
	requestId: number,
): Promise<RejectFriendRequestResponse> => {
	const response = await api.post<RejectFriendRequestResponse>(
		`/friends/reject/${requestId}`,
	);
	return response.data;
};

// フレンド削除
export const removeFriend = async (
	friendId: number,
): Promise<RemoveFriendResponse> => {
	const response = await api.delete<RemoveFriendResponse>(
		`/friends/${friendId}`,
	);
	return response.data;
};

// フレンドリスト取得
export const getFriends = async (): Promise<GetFriendsResponse> => {
	const response = await api.get<GetFriendsResponse>("/friends");
	return response.data;
};

// フレンドリクエスト一覧取得
export const getFriendRequests =
	async (): Promise<GetFriendRequestsResponse> => {
		const response =
			await api.get<GetFriendRequestsResponse>("/friends/requests");
		return response.data;
	};

// フレンド状態取得
export const getFriendStatus = async (
	userId: number,
): Promise<GetFriendStatusResponse> => {
	const response = await api.get<GetFriendStatusResponse>(
		`/friends/status/${userId}`,
	);
	return response.data;
};
