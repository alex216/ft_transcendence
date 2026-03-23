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
		<div className="legal-overlay" onClick={onClose}>
			<div className="legal-modal" onClick={(e) => e.stopPropagation()}>
				<div className="legal-modal-header">
					<h2>{t(`${ns}.title`)}</h2>
					<button className="legal-close-btn" onClick={onClose}>
						✕
					</button>
				</div>
				<div className="legal-modal-body">
					<p className="legal-updated">{t(`${ns}.updated`)}</p>
					<p className="legal-intro">{t(`${ns}.intro`)}</p>
					{Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
						<div key={n} className="legal-section">
							<h3>{t(`${ns}.s${n}Title`)}</h3>
							<p>{t(`${ns}.s${n}Body`)}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default LegalModal;
