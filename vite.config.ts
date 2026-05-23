import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { copyFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: {
				pdq:          resolve(__dirname, "src/pdq.ts"),
				distance:     resolve(__dirname, "src/distance.ts"),
				video:        resolve(__dirname, "src/video.ts"),
				pdqf:         resolve(__dirname, "src/pdqf.ts"),
				"tmk-compare":  resolve(__dirname, "src/tmk-compare.ts"),
				"vpdq-compare": resolve(__dirname, "src/vpdq-compare.ts"),
			},
			formats: ["es"],
		},
		sourcemap: true,
		outDir: "dist",
		rollupOptions: {
			output: {
				// Stable (non-hashed) chunk names so tmk-worker.js can import shared chunks
				chunkFileNames: "[name].js",
			},
		},
	},
	plugins: [
		{
			name: "copy-mp4box",
			closeBundle() {
				copyFileSync(
					resolve(__dirname, "node_modules/mp4box/dist/mp4box.all.js"),
					resolve(__dirname, "dist/mp4box.all.js")
				);
			}
		}
	]
});
