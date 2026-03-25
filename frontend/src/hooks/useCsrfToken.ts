import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "https://localhost/api";

// モジュールレベルキャッシュ：アプリ起動中は1回だけ取得
let cachedToken: string | null = null;
let pendingFetch: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
	if (cachedToken) return cachedToken;
	if (pendingFetch) return pendingFetch;

	pendingFetch = axios
		.get<{ csrfToken: string }>(`${API_URL}/auth/csrf-token`, {
			withCredentials: true,
		})
		.then((res) => {
			cachedToken = res.data.csrfToken;
			pendingFetch = null;
			return cachedToken;
		})
		.catch((err) => {
			pendingFetch = null;
			throw err;
		});

	return pendingFetch;
}

export function useCsrfToken() {
	const [csrfToken, setCsrfToken] = useState<string | null>(cachedToken);
	const [loading, setLoading] = useState(!cachedToken);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (cachedToken) {
			setCsrfToken(cachedToken);
			setLoading(false);
			return;
		}
		getCsrfToken()
			.then((token) => {
				setCsrfToken(token);
				setLoading(false);
			})
			.catch(() => {
				setError("CSRFトークンの取得に失敗しました");
				setLoading(false);
			});
	}, []);

	return { csrfToken, loading, error };
}
