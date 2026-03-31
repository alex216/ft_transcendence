import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGdpr } from "../hooks/useGdpr";
import styles from "./GdprSettings.module.css";

export default function GdprSettings({
	onAccountDeleted,
}: {
	onAccountDeleted?: () => void;
}) {
	const { t } = useTranslation();
	const { exportData, deleteAccount } = useGdpr();

	const [exporting, setExporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);

	const [showConfirm, setShowConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const handleExport = async () => {
		setExporting(true);
		setExportError(null);
		try {
			await exportData();
		} catch {
			setExportError(t("gdpr.exportFailed"));
		} finally {
			setExporting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		setDeleting(true);
		setDeleteError(null);
		try {
			await deleteAccount();
			onAccountDeleted?.();
		} catch {
			setDeleteError(t("gdpr.deleteFailed"));
			setDeleting(false);
		}
	};

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>{t("gdpr.title")}</h2>

			{/* データエクスポート */}
			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h3 className={styles.sectionTitle}>{t("gdpr.exportTitle")}</h3>
					<p className={styles.sectionDesc}>{t("gdpr.exportDesc")}</p>
				</div>
				<div className={styles.sectionAction}>
					<button
						className={styles.btnSecondary}
						onClick={handleExport}
						disabled={exporting}
					>
						{exporting ? t("gdpr.exporting") : t("gdpr.download")}
					</button>
					{exportError && <p className={styles.errorText}>{exportError}</p>}
				</div>
			</section>

			<hr className={styles.divider} />

			{/* アカウント削除 */}
			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
						{t("gdpr.deleteTitle")}
					</h3>
					<p className={styles.sectionDesc}>{t("gdpr.deleteDesc")}</p>
				</div>
				<div className={styles.sectionAction}>
					<button
						className={styles.btnDanger}
						onClick={() => setShowConfirm(true)}
					>
						{t("gdpr.deleteButton")}
					</button>
				</div>
			</section>

			{/* 削除確認ダイアログ */}
			{showConfirm && (
				<div className={styles.overlay} role="dialog" aria-modal="true">
					<div className={styles.dialog}>
						<h3 className={styles.dialogTitle}>{t("gdpr.confirmTitle")}</h3>
						<p className={styles.dialogDesc}>{t("gdpr.confirmDesc")}</p>
						{deleteError && <p className={styles.errorText}>{deleteError}</p>}
						<div className={styles.dialogActions}>
							<button
								className={styles.btnSecondary}
								onClick={() => {
									setShowConfirm(false);
									setDeleteError(null);
								}}
								disabled={deleting}
							>
								{t("common.cancel")}
							</button>
							<button
								className={styles.btnDanger}
								onClick={handleDeleteConfirm}
								disabled={deleting}
							>
								{deleting ? t("gdpr.deleting") : t("gdpr.deleteConfirm")}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
