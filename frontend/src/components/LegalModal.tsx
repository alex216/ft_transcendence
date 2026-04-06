import React from "react";
import { useTranslation } from "react-i18next";

export type LegalType = "privacy" | "terms";

interface LegalModalProps {
	type: LegalType;
	onClose: () => void;
}

const SECTION_COUNT = 6;

const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
	const { t } = useTranslation();

	const ns = `legal.${type}`;

	return (
		<div
			className="modal d-block"
			tabIndex={-1}
			role="dialog"
			aria-modal="true"
			aria-labelledby="legal-modal-title"
			onClick={onClose}
		>
			<div
				className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-content">
					<div className="modal-header legal-modal-header">
						<h2 id="legal-modal-title" className="modal-title text-white">
							{t(`${ns}.title`)}
						</h2>
						<button
							type="button"
							className="btn-close btn-close-white"
							onClick={onClose}
							aria-label="Close"
						/>
					</div>
					<div className="modal-body">
						<p className="text-muted small">{t(`${ns}.updated`)}</p>
						<p>{t(`${ns}.intro`)}</p>
						{Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
							<div key={n} className="mb-4">
								<h5>{t(`${ns}.s${n}Title`)}</h5>
								<p>{t(`${ns}.s${n}Body`)}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default LegalModal;
