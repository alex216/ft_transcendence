import React, { useState, useEffect } from "react";
import { getMyProfile, updateProfile } from "../api";

interface ProfileEditProps {
	onCancel: () => void;
	onSuccess: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ onCancel, onSuccess }) => {
	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			const data = await getMyProfile();
			setDisplayName(data.displayName || "");
			setBio(data.bio || "");
		} catch {
			setMessage("プロフィールの読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setMessage("");

		try {
			const response = await updateProfile({
				displayName: displayName.trim() || undefined,
				bio: bio.trim() || undefined,
			});
			setMessage(response.message);
			setTimeout(() => {
				onSuccess();
			}, 1000);
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "更新に失敗しました");
			setSaving(false);
		}
	};

	if (loading) {
		return <div className="profile-edit">読み込み中...</div>;
	}

	return (
		<div className="profile-edit">
			<h2>プロフィール編集</h2>

			<form onSubmit={handleSubmit}>
				<div className="form-group">
					<label htmlFor="displayName">表示名（最大50文字）</label>
					<input
						id="displayName"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						maxLength={50}
						placeholder="表示名を入力"
					/>
					<small>{displayName.length} / 50</small>
				</div>

				<div className="form-group">
					<label htmlFor="bio">自己紹介（最大500文字）</label>
					<textarea
						id="bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						maxLength={500}
						rows={5}
						placeholder="自己紹介を入力"
					/>
					<small>{bio.length} / 500</small>
				</div>

				<div className="form-actions">
					<button type="submit" className="btn-primary" disabled={saving}>
						{saving ? "保存中..." : "保存"}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="btn-secondary"
						disabled={saving}
					>
						キャンセル
					</button>
				</div>
			</form>

			{message && <p className="message">{message}</p>}
		</div>
	);
};

export default ProfileEdit;
