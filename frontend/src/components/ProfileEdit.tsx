import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getMyProfile, updateProfile } from "../api";

interface ProfileEditProps {
	onCancel: () => void;
	onSuccess: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ onCancel, onSuccess }) => {
	const { t } = useTranslation();
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
			setMessage(t("profile.loadFailed"));
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
			setMessage(
				error.response?.data?.message || t("profileEdit.updateFailed"),
			);
			setSaving(false);
		}
	};

	if (loading) {
		return <div className="profile-edit">{t("profile.loading")}</div>;
	}

	return (
		<div className="profile-edit">
			<h2>{t("profileEdit.title")}</h2>

			<form onSubmit={handleSubmit}>
				<div className="form-group">
					<label htmlFor="displayName">
						{t("profileEdit.displayNameLabel")}
					</label>
					<input
						id="displayName"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						maxLength={50}
						placeholder={t("profileEdit.displayNamePlaceholder")}
					/>
					<small>{displayName.length} / 50</small>
				</div>

				<div className="form-group">
					<label htmlFor="bio">{t("profileEdit.bioLabel")}</label>
					<textarea
						id="bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						maxLength={500}
						rows={5}
						placeholder={t("profileEdit.bioPlaceholder")}
					/>
					<small>{bio.length} / 500</small>
				</div>

				<div className="form-actions">
					<button type="submit" className="btn-primary" disabled={saving}>
						{saving ? t("profileEdit.saving") : t("profileEdit.save")}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="btn-secondary"
						disabled={saving}
					>
						{t("profileEdit.cancel")}
					</button>
				</div>
			</form>

			{message && <p className="message">{message}</p>}
		</div>
	);
};

export default ProfileEdit;
