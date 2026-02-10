import React, { useState, useEffect } from "react";
import { getMyProfile, uploadAvatar, deleteAvatar } from "../api";
import type { GetProfileResponse } from "/shared";

interface ProfileProps {
	onEdit: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onEdit }) => {
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
			setMessage("プロフィールの読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	};

	const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// ファイルサイズチェック（5MB）
		if (file.size > 5 * 1024 * 1024) {
			setMessage("ファイルサイズは5MB以下にしてください");
			return;
		}

		// ファイルタイプチェック
		if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
			setMessage("画像ファイル（JPG, PNG, GIF）のみアップロード可能です");
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
			setMessage(error.response?.data?.message || "アップロードに失敗しました");
		} finally {
			setUploading(false);
		}
	};

	const handleDeleteAvatar = async () => {
		if (!window.confirm("アバターを削除しますか？")) return;

		try {
			const response = await deleteAvatar();
			setMessage(response.message);
			await loadProfile();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "削除に失敗しました");
		}
	};

	if (loading) {
		return <div className="profile">読み込み中...</div>;
	}

	if (!profile) {
		return <div className="profile">プロフィールが見つかりません</div>;
	}

	return (
		<div className="profile">
			<h2>プロフィール</h2>

			<div className="profile-content">
				{/* アバター表示 */}
				<div className="avatar-section">
					{profile.avatarUrl ? (
						<img
							src={`${API_URL}${profile.avatarUrl}`}
							alt="アバター"
							className="avatar-large"
						/>
					) : (
						<div className="avatar-placeholder">
							{profile.username.charAt(0).toUpperCase()}
						</div>
					)}

					<div className="avatar-actions">
						<label className="btn-secondary">
							{uploading ? "アップロード中..." : "アバター変更"}
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
								削除
							</button>
						)}
					</div>
				</div>

				{/* プロフィール情報 */}
				<div className="profile-info">
					<div className="info-row">
						<span className="label">ユーザー名:</span>
						<span className="value">{profile.username}</span>
					</div>

					<div className="info-row">
						<span className="label">表示名:</span>
						<span className="value">{profile.displayName || "未設定"}</span>
					</div>

					<div className="info-row">
						<span className="label">自己紹介:</span>
						<span className="value bio">{profile.bio || "未設定"}</span>
					</div>

					<button onClick={onEdit} className="btn-primary">
						プロフィール編集
					</button>
				</div>
			</div>

			{message && <p className="message">{message}</p>}
		</div>
	);
};

export default Profile;
