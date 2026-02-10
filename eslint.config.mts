import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
// Note the `/flat` suffix here, the difference from default entry is that
// `/flat` added `name` property to the exported object to improve
// [config-inspector](https://eslint.org/blog/2024/04/eslint-config-inspector/) experience.
import eslintConfigPrettier from "eslint-config-prettier/flat";

export const LINT_TARGET_FILES = ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"];
// 各サブプロジェクトで継承可能
export default defineConfig([
	{
		// ビルド結果やnode_modulesを無視
		ignores: [
			"**/dist/**",
			"**/node_modules/**",
			"**/build/**",
			"**/package-lock.json",
			"**/.vscode/**",
			"eslint.config.mts", // 型定義の問題により除外
		],
	},
	{
		files: LINT_TARGET_FILES,
		plugins: { js },
		extends: ["js/recommended"],
		languageOptions: { globals: globals.browser },
	},
	tseslint.configs.recommended,
	{
		files: ["**/*.json"],
		// @ts-expect-error - Plugin type mismatch with @eslint/json
		plugins: { json },
		language: "json/json",
		extends: ["json/recommended"],
	},
	{
		files: ["**/*.jsonc"],
		// @ts-expect-error - Plugin type mismatch with @eslint/json
		plugins: { json },
		language: "json/jsonc",
		extends: ["json/recommended"],
	},
	{
		files: ["**/*.md"],
		plugins: { markdown },
		language: "markdown/gfm",
		extends: ["markdown/recommended"],
	},
	{
		files: ["**/*.css"],
		plugins: { css },
		language: "css/css",
		extends: ["css/recommended"],
		rules: {
			// resize, font-family等のモダンブラウザでサポートされているプロパティを許可
			"css/use-baseline": "off",
			"css/font-family-fallbacks": "off",
		},
	},
	eslintConfigPrettier,
]);
