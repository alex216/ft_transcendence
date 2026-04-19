import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProfile } from "../api";
import type { GetProfileResponse } from "/shared";

interface UserProfileModalProps {
	userId: number;
	onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
	userId,
	onClose,
}) => {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<GetProfileResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const loadProfile = async () => {
			try {
				const data = await getProfile(userId);
				if (cancelled) return;
				setProfile(data);
			} catch (err) {
				if (cancelled) return;
				const status = (err as { response?: { status?: number } }).response
					?.status;
				setErrorMessage(
					status === 404 ? t("profile.notFound") : t("profile.loadFailed"),
				);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		loadProfile();
		return () => {
			cancelled = true;
		};
	}, [userId, t]);

	return (
		<div
			className="modal d-block"
			tabIndex={-1}
			role="dialog"
			aria-modal="true"
			aria-labelledby="user-profile-modal-title"
			onClick={onClose}
		>
			<div
				className="modal-dialog modal-dialog-centered"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-content">
					<div className="modal-header">
						<h2 id="user-profile-modal-title" className="modal-title">
							{t("profile.title")}
						</h2>
						<button
							type="button"
							className="btn-close"
							onClick={onClose}
							aria-label={t("common.close")}
						/>
					</div>
					<div className="modal-body">
						{loading && <p>{t("profile.loading")}</p>}
						{!loading && errorMessage && <p>{errorMessage}</p>}
						{!loading && profile && (
							<div className="d-flex flex-column align-items-center gap-4">
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
								<div className="w-100">
									<div className="mb-3">
										<span className="d-block fw-bold text-muted mb-1">
											{t("profile.username")}:
										</span>
										<span className="d-block text-dark fs-6">
											{profile.username}
										</span>
									</div>
									<div className="mb-3">
										<span className="d-block fw-bold text-muted mb-1">
											{t("profile.displayName")}:
										</span>
										<span className="d-block text-dark fs-6">
											{profile.displayName || t("profile.notSet")}
										</span>
									</div>
									<div className="mb-0">
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
								</div>
							</div>
						)}
					</div>
					<div className="modal-footer">
						<button
							type="button"
							className="btn btn-secondary"
							onClick={onClose}
						>
							{t("common.close")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default UserProfileModal;
