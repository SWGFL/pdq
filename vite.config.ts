import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: {
				pdq: resolve(__dirname, "src/pdq.ts")
			},
			formats: ["es"],
		},
		sourcemap: true,
		outDir: "dist",
	},
});
