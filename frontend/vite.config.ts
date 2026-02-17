import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"/shared": path.resolve(__dirname, "../shared"),
		},
	},
	server: {
		host: "0.0.0.0", // Docker内で外部からアクセス可能にする
		port: 3001,
		watch: {
			usePolling: true, // Dockerボリューム内でのファイル監視
		},
	},
});
