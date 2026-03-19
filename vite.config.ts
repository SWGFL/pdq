import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/pdq.ts"),
			formats: ["es"],
			fileName: "pdq",
		},
		sourcemap: true,
		outDir: "dist",
	},
});
