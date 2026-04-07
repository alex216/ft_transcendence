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
				<div className="mb-3">
					<label htmlFor="displayName" className="form-label">
						{t("profileEdit.displayNameLabel")}
					</label>
					<input
						className="form-control"
						id="displayName"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						maxLength={50}
						placeholder={t("profileEdit.displayNamePlaceholder")}
					/>
					<small className="form-text text-muted">
						{displayName.length} / 50
					</small>
				</div>

				<div className="mb-3">
					<label htmlFor="bio" className="form-label">
						{t("profileEdit.bioLabel")}
					</label>
					<textarea
						className="form-control"
						id="bio"
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						maxLength={500}
						rows={5}
						placeholder={t("profileEdit.bioPlaceholder")}
					/>
					<small className="form-text text-muted">{bio.length} / 500</small>
				</div>

				<div className="d-flex gap-2 mt-4">
					<button type="submit" className="btn btn-primary" disabled={saving}>
						{saving ? t("profileEdit.saving") : t("profileEdit.save")}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="btn btn-secondary"
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
