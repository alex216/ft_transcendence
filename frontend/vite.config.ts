import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		host: "0.0.0.0", // Docker内で外部からアクセス可能にする
		port: 3001,
		watch: {
			usePolling: true, // Dockerボリューム内でのファイル監視
		},
	},
});
