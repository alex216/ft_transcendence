import axios from 'axios';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  GetMeResponse,
  LogoutResponse,
} from '/shared';

// バックエンドAPIとの通信を担当
// C++で言うと「HTTPクライアント」のようなもの
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// axiosの設定（クッキーを送信するために必要）
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // セッションクッキーを含める
});

// ユーザー登録
export const register = async (username: string, password: string): Promise<RegisterResponse> => {
  const requestBody: RegisterRequest = { username, password };
  const response = await api.post<RegisterResponse>('/auth/register', requestBody);
  return response.data;
};

// ログイン
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const requestBody: LoginRequest = { username, password };
  const response = await api.post<LoginResponse>('/auth/login', requestBody);
  return response.data;
};

// 現在のユーザー情報取得
export const getCurrentUser = async (): Promise<GetMeResponse> => {
  const response = await api.get<GetMeResponse>('/auth/me');
  return response.data;
};

// ログアウト
export const logout = async (): Promise<LogoutResponse> => {
  const response = await api.post<LogoutResponse>('/auth/logout');
  return response.data;
};
