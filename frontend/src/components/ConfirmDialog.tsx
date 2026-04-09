import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
};

function ConfirmDialog({
	title,
	message,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<div className={styles.overlay} onClick={onCancel}>
			<div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
				<h3 className={styles.title}>{title}</h3>
				<p className={styles.message}>{message}</p>
				<div className={styles.actions}>
					<button className={styles.btnCancel} onClick={onCancel}>
						{cancelLabel}
					</button>
					<button className={styles.btnConfirm} onClick={onConfirm}>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

export default ConfirmDialog;
