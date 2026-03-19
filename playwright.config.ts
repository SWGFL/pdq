import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 60_000,
	use: {
		baseURL: "http://localhost:5173",
	},
	webServer: {
		command: "npx vite --port 5173",
		port: 5173,
		reuseExistingServer: true,
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
