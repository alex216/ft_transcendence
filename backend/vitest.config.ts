import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
	plugins: [
		swc.vite({
			module: { type: "es6" },
			jsc: {
				target: "es2021",
				transform: {
					legacyDecorator: true,
					decoratorMetadata: true,
				},
			},
		}),
	],
	test: {
		globals: true,
		environment: "node",
		include: ["/test/**/*.spec.ts"],
		exclude: [
			"**/node_modules/**",
			"/test/node_modules/**",
			"/app/node_modules/**",
		],
		testTimeout: 30000,
		hookTimeout: 30000,
		pool: "forks",
		poolOptions: {
			forks: { singleFork: true },
		},
		setupFiles: ["/test/jest-env-setup.ts"],
		onConsoleLog() {
			return false;
		},
	},
});
