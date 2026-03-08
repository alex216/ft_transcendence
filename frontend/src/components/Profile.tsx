import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getMyProfile, uploadAvatar, deleteAvatar } from "../api";
import type { GetProfileResponse } from "/shared";

interface ProfileProps {
	onEdit: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onEdit }) => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<GetProfileResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [uploading, setUploading] = useState(false);

	const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

			<div className="profile-content">
				{/* アバター表示 */}
				<div className="avatar-section">
					{profile.avatarUrl ? (
						<img
							src={`${API_URL}${profile.avatarUrl}`}
							alt={t("profile.avatar")}
							className="avatar-large"
						/>
					) : (
						<div className="avatar-placeholder">
							{profile.username.charAt(0).toUpperCase()}
						</div>
					)}

					<div className="avatar-actions">
						<label className="btn-secondary">
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
								className="btn-danger"
								disabled={uploading}
							>
								{t("profile.delete")}
							</button>
						)}
					</div>
				</div>

				{/* プロフィール情報 */}
				<div className="profile-info">
					<div className="info-row">
						<span className="label">{t("profile.username")}:</span>
						<span className="value">{profile.username}</span>
					</div>

					<div className="info-row">
						<span className="label">{t("profile.displayName")}:</span>
						<span className="value">
							{profile.displayName || t("profile.notSet")}
						</span>
					</div>

					<div className="info-row">
						<span className="label">{t("profile.bio")}:</span>
						<span className="value bio">
							{profile.bio || t("profile.notSet")}
						</span>
					</div>

					<button onClick={onEdit} className="btn-primary">
						{t("profile.edit")}
					</button>
				</div>
			</div>

			{message && <p className="message">{message}</p>}
		</div>
	);
};

export default Profile;
