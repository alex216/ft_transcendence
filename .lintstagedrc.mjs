// eslint.config.mts から LINT_TARGET_FILES = ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"] を手動同期
const LINT_TARGET_FILES = "**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}";

export default {
	// ESLint設定から対象ファイルパターンを厳密に読み込み
	[LINT_TARGET_FILES]: ["eslint --fix", "prettier --write"],
	// JSON/JSONCファイルにはPrettierのみ適用（ESLintは除外）
	"**/*.{json,jsonc}": ["prettier --write"],
	// その他のファイルにもPrettierを適用
	"**/*": "prettier --write --ignore-unknown",
};
