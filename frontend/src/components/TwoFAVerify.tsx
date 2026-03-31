import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { verify2FA, getCurrentUser } from "../api";
import type { GetMeResponse } from "/shared";

interface TwoFAVerifyProps {
	onVerified: (user: GetMeResponse) => void;
	onCancel: () => void;
}

// 2FAコード入力画面
// ログイン時に "2FA_REQUIRED" を受け取った場合に表示される
function TwoFAVerify({ onVerified, onCancel }: TwoFAVerifyProps) {
	const { t } = useTranslation();
	const [token, setToken] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");
		try {
			await verify2FA(token);
			const userData = await getCurrentUser();
			onVerified(userData);
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "twofa.verifyFailed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-content">
			<h1>ft_transcendence</h1>

			<div className="auth-form twofa-verify">
				<h2>{t("twofa.verifyTitle")}</h2>
				<p>{t("twofa.verifyDescription")}</p>

				<form onSubmit={handleSubmit}>
					<input
						type="text"
						placeholder={t("twofa.codePlaceholder")}
						value={token}
						onChange={(e) => {
							// 数字のみ、最大6桁
							const val = e.target.value.replace(/\D/g, "").slice(0, 6);
							setToken(val);
						}}
						inputMode="numeric"
						maxLength={6}
						autoFocus
						required
					/>

					<button type="submit" disabled={loading || token.length !== 6}>
						{loading ? t("twofa.verifying") : t("twofa.verify")}
					</button>
				</form>

				<button className="btn-back" onClick={onCancel}>
					{t("twofa.backToLogin")}
				</button>

				{message && <p className="message error">{t(message)}</p>}
			</div>
		</div>
	);
}

export default TwoFAVerify;
