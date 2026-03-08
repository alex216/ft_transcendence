import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ja from "./locales/ja.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

// ブラウザの言語設定を取得（日本語なら'ja'、それ以外は'en'）
const getBrowserLanguage = (): string => {
	const lang = navigator.language.split("-")[0];
	if (lang === "ja") return "ja";
	if (lang === "fr") return "fr";
	return "en";
};

// localStorageから保存された言語設定を取得、なければブラウザ設定を使用
const getSavedLanguage = (): string => {
	const saved = localStorage.getItem("language");
	if (saved && (saved === "ja" || saved === "en" || saved === "fr")) {
		return saved;
	}
	return getBrowserLanguage();
};

i18n.use(initReactI18next).init({
	resources: {
		ja: { translation: ja },
		en: { translation: en },
		fr: { translation: fr },
	},
	lng: getSavedLanguage(),
	fallbackLng: "en",
	interpolation: {
		escapeValue: false, // Reactは既にXSS対策済み
	},
});

// 言語を変更して保存する関数
export const changeLanguage = (lang: "ja" | "en" | "fr") => {
	i18n.changeLanguage(lang);
	localStorage.setItem("language", lang);
};

// 言語の表示ラベル
export const LANGUAGE_LABELS: Record<string, string> = {
	en: "EN",
	ja: "JA",
	fr: "FR",
};

// 次の言語に切り替える（サイクル: en -> ja -> fr -> en）
const LANGUAGE_ORDER: ("ja" | "en" | "fr")[] = ["en", "ja", "fr"];
export const cycleLanguage = () => {
	const currentIndex = LANGUAGE_ORDER.indexOf(
		i18n.language as "ja" | "en" | "fr",
	);
	const nextIndex = (currentIndex + 1) % LANGUAGE_ORDER.length;
	changeLanguage(LANGUAGE_ORDER[nextIndex]);
};

export default i18n;
