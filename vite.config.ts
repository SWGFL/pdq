import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: {
				pdq: resolve(__dirname, "src/pdq.ts"),
				vpdq: resolve(__dirname, "src/vpdq.ts"),
			},
			formats: ["es"],
		},
		sourcemap: true,
		outDir: "dist",
	},
});
