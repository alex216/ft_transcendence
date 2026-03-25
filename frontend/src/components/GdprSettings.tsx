import React, { useState } from "react";
import { useGdpr } from "../hooks/useGdpr";
import styles from "./GdprSettings.module.css";

export default function GdprSettings({
	onAccountDeleted,
}: {
	onAccountDeleted?: () => void;
}) {
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
			setExportError("データのエクスポートに失敗しました");
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
			setDeleteError("アカウントの削除に失敗しました");
			setDeleting(false);
		}
	};

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>プライバシー設定</h2>

			{/* データエクスポート */}
			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h3 className={styles.sectionTitle}>データエクスポート</h3>
					<p className={styles.sectionDesc}>
						あなたのすべてのデータ（プロフィール、対戦履歴、チャットなど）をJSON形式でダウンロードできます。
					</p>
				</div>
				<div className={styles.sectionAction}>
					<button
						className={styles.btnSecondary}
						onClick={handleExport}
						disabled={exporting}
					>
						{exporting ? "エクスポート中..." : "データをダウンロード"}
					</button>
					{exportError && <p className={styles.errorText}>{exportError}</p>}
				</div>
			</section>

			<hr className={styles.divider} />

			{/* アカウント削除 */}
			<section className={styles.section}>
				<div className={styles.sectionHeader}>
					<h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
						アカウント削除
					</h3>
					<p className={styles.sectionDesc}>
						アカウントを削除すると、すべてのデータ（プロフィール、対戦履歴、フレンド関係、チャット履歴）が完全に消去されます。この操作は取り消せません。
					</p>
				</div>
				<div className={styles.sectionAction}>
					<button
						className={styles.btnDanger}
						onClick={() => setShowConfirm(true)}
					>
						アカウントを削除
					</button>
				</div>
			</section>

			{/* 削除確認ダイアログ */}
			{showConfirm && (
				<div className={styles.overlay} role="dialog" aria-modal="true">
					<div className={styles.dialog}>
						<h3 className={styles.dialogTitle}>本当に削除しますか？</h3>
						<p className={styles.dialogDesc}>
							この操作は取り消せません。すべてのデータが完全に削除されます。
						</p>
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
								キャンセル
							</button>
							<button
								className={styles.btnDanger}
								onClick={handleDeleteConfirm}
								disabled={deleting}
							>
								{deleting ? "削除中..." : "削除する"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
