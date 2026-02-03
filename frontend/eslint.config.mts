import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
// ルートの共通設定を継承
import rootConfig from "../eslint.config.mts";

// 共通設定 + React固有の設定
export default defineConfig([
	...rootConfig, // 共通設定を継承
	pluginReact.configs.flat.recommended,
	{
		settings: {
			react: {
				version: "detect",
			},
		},
	},
]);
