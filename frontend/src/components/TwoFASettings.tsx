import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { setup2FA, enable2FA, disable2FA } from "../api";

interface TwoFASettingsProps {
	is2FAEnabled: boolean;
	onStatusChange: () => void;
}

// 2FA設定コンポーネント（Profile内に埋め込み）
function TwoFASettings({ is2FAEnabled, onStatusChange }: TwoFASettingsProps) {
	const { t } = useTranslation();
	const [qrCode, setQrCode] = useState<string | null>(null);
	const [token, setToken] = useState("");
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(false);

	// QRコードを取得して表示
	const handleSetup = async () => {
		setLoading(true);
		setMessage("");
		try {
			const data = await setup2FA();
			setQrCode(data.qrCodeUrl);
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "twofa.setupFailed");
		} finally {
			setLoading(false);
		}
	};

	// TOTPコードを送って2FAを有効化
	const handleEnable = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");
		try {
			await enable2FA(token);
			setMessage("twofa.enableSuccess");
			setQrCode(null);
			setToken("");
			onStatusChange();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "twofa.enableFailed");
		} finally {
			setLoading(false);
		}
	};

	// 2FAを無効化
	const handleDisable = async () => {
		if (!window.confirm(t("twofa.disableConfirm"))) return;
		setLoading(true);
		setMessage("");
		try {
			await disable2FA();
			setMessage("twofa.disableSuccess");
			onStatusChange();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "twofa.disableFailed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="twofa-settings">
			<h3>{t("twofa.title")}</h3>

			<p className="twofa-status">
				<span
					className={`twofa-status-dot ${is2FAEnabled ? "enabled" : "disabled"}`}
				/>
				{is2FAEnabled ? t("twofa.enabled") : t("twofa.disabled")}
			</p>

			{is2FAEnabled ? (
				<button
					onClick={handleDisable}
					disabled={loading}
					className="btn-danger"
				>
					{loading ? t("twofa.disabling") : t("twofa.disable")}
				</button>
			) : qrCode ? (
				<div className="twofa-setup">
					<p>{t("twofa.scanQr")}</p>
					<img src={qrCode} alt="2FA QR Code" className="qr-code" />
					<form onSubmit={handleEnable}>
						<input
							type="text"
							placeholder={t("twofa.codePlaceholder")}
							value={token}
							onChange={(e) => {
								const val = e.target.value.replace(/\D/g, "").slice(0, 6);
								setToken(val);
							}}
							inputMode="numeric"
							maxLength={6}
							required
						/>
						<button
							type="submit"
							disabled={loading || token.length !== 6}
							className="btn-primary-small"
						>
							{loading ? t("twofa.enabling") : t("twofa.enable")}
						</button>
					</form>
					<button onClick={() => setQrCode(null)} className="twofa-cancel">
						{t("common.cancel")}
					</button>
				</div>
			) : (
				<button
					onClick={handleSetup}
					disabled={loading}
					className="btn-primary-small"
				>
					{loading ? t("twofa.settingUp") : t("twofa.setup")}
				</button>
			)}

			{message && <p className="message">{t(message)}</p>}
		</div>
	);
}

export default TwoFASettings;
