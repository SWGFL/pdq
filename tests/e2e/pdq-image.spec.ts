import { test, expect } from "@playwright/test";

const HARNESS = "/tests/e2e/harness.html";
const ASSETS = "/tests/assets";

test.beforeEach(async ({ page }) => {
	await page.goto(HARNESS);
	await page.waitForFunction(() => (window as any).__ready === true);
});

test.describe("PDQ image hashing", () => {
	test("hashes a real image and returns a valid result", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const pdq = (window as any).__pdq;
			const img = new Image();
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error("Failed to load image"));
				img.src = src;
			});
			const canvas = document.createElement("canvas");
			canvas.width = 512;
			canvas.height = 512;
			canvas.getContext("2d")!.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
			return pdq(canvas);
		}, `${ASSETS}/cat.jpg`);

		expect(result.type).toBe("pdq");
		expect(typeof result.hash).toBe("string");
		expect(result.hash).toHaveLength(64);
		expect(result.quality).toBeGreaterThan(0);
		expect(result.quality).toBeLessThanOrEqual(100);
	});

	test("produces deterministic hashes for the same image", async ({ page }) => {
		const [hash1, hash2] = await page.evaluate(async (src) => {
			const pdq = (window as any).__pdq;
			async function hashImage() {
				const img = new Image();
				await new Promise<void>((resolve) => {
					img.onload = () => resolve();
					img.src = src;
				});
				const canvas = document.createElement("canvas");
				canvas.width = 512;
				canvas.height = 512;
				canvas.getContext("2d")!.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
				return pdq(canvas);
			}
			return [await hashImage(), await hashImage()];
		}, `${ASSETS}/cat.jpg`);

		expect(hash1.hash).toBe(hash2.hash);
		expect(hash1.quality).toBe(hash2.quality);
	});

	test("produces different hashes for different images", async ({ page }) => {
		const [catHash, carHash] = await page.evaluate(async (assets) => {
			const pdq = (window as any).__pdq;
			async function hashImage(src: string) {
				const img = new Image();
				await new Promise<void>((resolve) => {
					img.onload = () => resolve();
					img.src = src;
				});
				const canvas = document.createElement("canvas");
				canvas.width = 512;
				canvas.height = 512;
				canvas.getContext("2d")!.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
				return pdq(canvas);
			}
			return [
				await hashImage(`${assets}/cat.jpg`),
				await hashImage(`${assets}/car.jpg`),
			];
		}, ASSETS);

		expect(catHash.hash).not.toBe(carHash.hash);
	});

	test("generates 8 dihedral hashes with transform: true", async ({ page }) => {
		const result = await page.evaluate(async (src) => {
			const pdq = (window as any).__pdq;
			const img = new Image();
			await new Promise<void>((resolve) => {
				img.onload = () => resolve();
				img.src = src;
			});
			const canvas = document.createElement("canvas");
			canvas.width = 512;
			canvas.height = 512;
			canvas.getContext("2d")!.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
			return pdq(canvas, { transform: true });
		}, `${ASSETS}/party.jpg`);

		expect(Array.isArray(result.hash)).toBe(true);
		expect(result.hash).toHaveLength(8);
		// all 8 should be unique hex strings
		const unique = new Set(result.hash);
		expect(unique.size).toBe(8);
		for (const h of result.hash) {
			expect(h).toHaveLength(64);
		}
	});

	test("all three images produce quality > 0", async ({ page }) => {
		const qualities = await page.evaluate(async (assets) => {
			const pdq = (window as any).__pdq;
			const results: number[] = [];
			for (const file of ["cat.jpg", "car.jpg", "party.jpg"]) {
				const img = new Image();
				await new Promise<void>((resolve) => {
					img.onload = () => resolve();
					img.src = `${assets}/${file}`;
				});
				const canvas = document.createElement("canvas");
				canvas.width = 512;
				canvas.height = 512;
				canvas.getContext("2d")!.drawImage(img, 0, 0, img.width, img.height, 0, 0, 512, 512);
				const r = await pdq(canvas);
				results.push(r.quality);
			}
			return results;
		}, ASSETS);

		for (const q of qualities) {
			expect(q).toBeGreaterThan(0);
		}
	});
});
