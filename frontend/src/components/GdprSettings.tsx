import { useState } from "react";
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
			<h2 className="fs-4 fw-bold text-dark mb-4 text-start">
				{t("gdpr.title")}
			</h2>

			{/* データエクスポート */}
			<section className="d-flex justify-content-between align-items-start gap-4 py-4">
				<div className="flex-grow-1">
					<h3 className="fs-6 fw-semibold text-dark mb-2">
						{t("gdpr.exportTitle")}
					</h3>
					<p className="small text-muted lh-lg mb-0">{t("gdpr.exportDesc")}</p>
				</div>
				<div className="d-flex flex-column align-items-end gap-2 flex-shrink-0">
					<button
						className="btn btn-outline-secondary btn-sm text-nowrap"
						onClick={handleExport}
						disabled={exporting}
					>
						{exporting ? t("gdpr.exporting") : t("gdpr.download")}
					</button>
					{exportError && (
						<p className="small text-danger mb-0">{exportError}</p>
					)}
				</div>
			</section>

			<hr className="m-0" />

			{/* アカウント削除 */}
			<section className="d-flex justify-content-between align-items-start gap-4 py-4">
				<div className="flex-grow-1">
					<h3 className="fs-6 fw-semibold text-danger mb-2">
						{t("gdpr.deleteTitle")}
					</h3>
					<p className="small text-muted lh-lg mb-0">{t("gdpr.deleteDesc")}</p>
				</div>
				<div className="d-flex flex-column align-items-end gap-2 flex-shrink-0">
					<button
						className="btn btn-danger btn-sm text-nowrap"
						onClick={() => setShowConfirm(true)}
					>
						{t("gdpr.deleteButton")}
					</button>
				</div>
			</section>

			{/* 削除確認ダイアログ */}
			{showConfirm && (
				<div className={styles.overlay} role="dialog" aria-modal="true">
					<div
						className="bg-white rounded-3 p-4 shadow-lg w-100"
						style={{ maxWidth: 420 }}
					>
						<h3 className="fs-5 fw-bold text-dark mb-3">
							{t("gdpr.confirmTitle")}
						</h3>
						<p className="small text-muted lh-lg mb-4">
							{t("gdpr.confirmDesc")}
						</p>
						{deleteError && (
							<p className="small text-danger mb-3">{deleteError}</p>
						)}
						<div className="d-flex justify-content-end gap-2">
							<button
								className="btn btn-outline-secondary btn-sm"
								onClick={() => {
									setShowConfirm(false);
									setDeleteError(null);
								}}
								disabled={deleting}
							>
								{t("common.cancel")}
							</button>
							<button
								className="btn btn-danger btn-sm"
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
