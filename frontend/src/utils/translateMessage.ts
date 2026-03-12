import i18n from "../i18n";

/**
 * バックエンドから受け取ったメッセージキーを翻訳する。
 * キーがi18n翻訳に存在すれば翻訳文字列を返し、なければそのまま返す（後方互換性）。
 */
export const translateMessage = (message: string | undefined): string => {
	if (!message) return "";
	if (i18n.exists(message)) {
		return i18n.t(message);
	}
	return message;
};
