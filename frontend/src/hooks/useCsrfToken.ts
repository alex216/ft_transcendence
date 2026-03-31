import { useState, useEffect } from "react";
import { api } from "../api";

// モジュールレベルキャッシュ：アプリ起動中は1回だけ取得
let cachedToken: string | null = null;
let pendingFetch: Promise<string> | null = null;

export async function getCsrfToken(): Promise<string> {
	if (cachedToken) return cachedToken;
	if (pendingFetch) return pendingFetch;

	pendingFetch = api
		.get<{ csrfToken: string }>("/auth/csrf-token")
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
				setError("gdpr.csrfFailed");
				setLoading(false);
			});
	}, []);

	return { csrfToken, loading, error };
}
