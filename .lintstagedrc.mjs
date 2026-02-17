import { LINT_TARGET_FILES } from "./eslint.config.mts";

export default {
	// ESLint設定から対象ファイルパターンを厳密に読み込み
	[LINT_TARGET_FILES]: ["eslint --fix", "prettier --write"],
	// JSON/JSONCファイルにはPrettierのみ適用（ESLintは除外）
	"**/*.{json,jsonc}": ["prettier --write"],
	// その他のファイルにもPrettierを適用
	"**/*": "prettier --write --ignore-unknown",
};
