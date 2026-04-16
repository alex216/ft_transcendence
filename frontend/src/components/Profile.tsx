import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getMyProfile, uploadAvatar, deleteAvatar } from "../api";
import type { GetProfileResponse } from "/shared";
import TwoFASettings from "./TwoFASettings";

interface ProfileProps {
	onEdit: () => void;
	is2FAEnabled: boolean;
	onRefreshUser: () => void;
}

const Profile: React.FC<ProfileProps> = ({
	onEdit,
	is2FAEnabled,
	onRefreshUser,
}) => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<GetProfileResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [uploading, setUploading] = useState(false);

	// アバター画像はnginxの /uploads/ ルートから配信されるので
	// avatarUrl（例: /uploads/avatar.png）をそのまま使える

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			const data = await getMyProfile();
			setProfile(data);
		} catch {
			setMessage(t("profile.loadFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// ファイルサイズチェック（5MB）
		if (file.size > 5 * 1024 * 1024) {
			setMessage(t("profile.fileSizeError"));
			return;
		}

		// ファイルタイプチェック
		if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
			setMessage(t("profile.fileTypeError"));
			return;
		}

		setUploading(true);
		setMessage("");

		try {
			const response = await uploadAvatar(file);
			if (!response.success) {
				setMessage(response.message);
				return;
			}
			setMessage(response.message);
			// プロフィールを再読み込み
			await loadProfile();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || t("profile.uploadFailed"));
		} finally {
			setUploading(false);
		}
	};

	const handleDeleteAvatar = async () => {
		if (!window.confirm(t("profile.deleteConfirm"))) return;

		try {
			const response = await deleteAvatar();
			if (!response.success) {
				setMessage(response.message);
				return;
			}
			setMessage(response.message);
			await loadProfile();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || t("profile.deleteFailed"));
		}
	};

	if (loading) {
		return <div className="profile">{t("profile.loading")}</div>;
	}

	if (!profile) {
		return <div className="profile">{t("profile.notFound")}</div>;
	}

	return (
		<div className="profile">
			<h2>{t("profile.title")}</h2>

			<div className="d-flex gap-5 bg-white p-5 rounded-3 shadow-sm">
				{/* アバター表示 */}
				<div className="d-flex flex-column align-items-center gap-3">
					{profile.avatarUrl ? (
						<img
							src={profile.avatarUrl}
							alt={t("profile.avatar")}
							className="avatar-large"
						/>
					) : (
						<div className="avatar-placeholder">
							{profile.username.charAt(0).toUpperCase()}
						</div>
					)}

					<div className="d-flex gap-2">
						<label className="btn btn-secondary">
							{uploading ? t("profile.uploading") : t("profile.changeAvatar")}
							<input
								type="file"
								accept="image/*"
								onChange={handleAvatarUpload}
								disabled={uploading}
								style={{ display: "none" }}
							/>
						</label>
						{profile.avatarUrl && (
							<button
								onClick={handleDeleteAvatar}
								className="btn btn-danger"
								disabled={uploading}
							>
								{t("profile.delete")}
							</button>
						)}
					</div>
				</div>

				{/* プロフィール情報 */}
				<div className="flex-grow-1">
					<div className="mb-4">
						<span className="d-block fw-bold text-muted mb-1">
							{t("profile.username")}:
						</span>
						<span className="d-block text-dark fs-6">{profile.username}</span>
					</div>

					<div className="mb-4">
						<span className="d-block fw-bold text-muted mb-1">
							{t("profile.displayName")}:
						</span>
						<span className="d-block text-dark fs-6">
							{profile.displayName || t("profile.notSet")}
						</span>
					</div>

					<div className="mb-4">
						<span className="d-block fw-bold text-muted mb-1">
							{t("profile.bio")}:
						</span>
						<span
							className="d-block text-dark fs-6"
							style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
						>
							{profile.bio || t("profile.notSet")}
						</span>
					</div>

					<button onClick={onEdit} className="btn btn-primary">
						{t("profile.edit")}
					</button>
				</div>
			</div>

			{/* 2FA設定セクション */}
			<TwoFASettings
				is2FAEnabled={is2FAEnabled}
				onStatusChange={onRefreshUser}
			/>

			{message && <p className="message">{message}</p>}
		</div>
	);
};

export default Profile;
