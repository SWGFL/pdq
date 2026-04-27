import { describe, it, expect } from "vitest";
import { resolve } from "path";
import sharp from "sharp";
import { pdqRaw } from "../src/pdq";
import distance from "../src/distance";
import { makeUniformRGBA, makeGradientRGBA } from "./helpers";

const ASSETS = resolve(__dirname, "assets");

async function loadImage(filename: string) {
	const image = sharp(resolve(ASSETS, filename)),
		{ width, height } = await image.metadata(),
		data = await image.raw().ensureAlpha().toBuffer();
	return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: width!, height: height! };
}

function makeCheckerRGBA(width: number, height: number, squareSize: number): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4,
				val = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0 ? 255 : 0;
			data[i] = val;
			data[i + 1] = val;
			data[i + 2] = val;
			data[i + 3] = 255;
		}
	}
	return data;
}

describe("pdqRaw", () => {
	it("returns a valid PdqResult", async () => {
		const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256);
		expect(result.type).toBe("pdq");
		expect(typeof result.hash).toBe("string");
		expect(result.hash).toHaveLength(64);
		expect(typeof result.quality).toBe("number");
	});

	it("produces a 64-character hex hash", async () => {
		const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256);
		expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic", async () => {
		const data = makeGradientRGBA(256, 256),
			result1 = await pdqRaw(data, 256, 256),
			result2 = await pdqRaw(new Uint8ClampedArray(data), 256, 256);
		expect(result1.hash).toBe(result2.hash);
		expect(result1.quality).toBe(result2.quality);
	});

	it("produces the expected hash for a gradient image", async () => {
		const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256);
		expect(result.hash).toBe("5977ab28565d6d7f451240c0c6552ddf5557abaa54ab62355d7f052821d95a94");
		expect(result.quality).toBe(44);
	});

	it("produces the expected hash for a uniform image", async () => {
		const result = await pdqRaw(makeUniformRGBA(256, 256, 128, 128, 128), 256, 256);
		expect(result.hash).toBe("b3b84c41b3b8b3ba4c444c07b33bb3bab3b84c474c65b39ab39a4c44b39a4c05");
		expect(result.quality).toBe(0);
	});

	it("produces the expected hash for a checkerboard image", async () => {
		const result = await pdqRaw(makeCheckerRGBA(256, 256, 32), 256, 256);
		expect(result.hash).toBe("5502ff2a552aff2a572aff2a5f2aff2a00d500d57f2a00d57f2a00d57f2a00d5");
		expect(result.quality).toBe(100);
	});

	it("produces different hashes for different images", async () => {
		const gradient = await pdqRaw(makeGradientRGBA(256, 256), 256, 256),
			checker = await pdqRaw(makeCheckerRGBA(256, 256, 32), 256, 256),
			uniform = await pdqRaw(makeUniformRGBA(256, 256, 128, 128, 128), 256, 256);
		expect(gradient.hash).not.toBe(checker.hash);
		expect(gradient.hash).not.toBe(uniform.hash);
		expect(checker.hash).not.toBe(uniform.hash);
	});

	it("uniform image has quality 0", async () => {
		const result = await pdqRaw(makeUniformRGBA(256, 256, 200, 200, 200), 256, 256);
		expect(result.quality).toBe(0);
	});

	it("checkerboard image has high quality", async () => {
		const result = await pdqRaw(makeCheckerRGBA(256, 256, 32), 256, 256);
		expect(result.quality).toBeGreaterThan(50);
	});

	it("works with non-square images", async () => {
		const result = await pdqRaw(makeGradientRGBA(512, 128), 512, 128);
		expect(result.type).toBe("pdq");
		expect(result.hash).toHaveLength(64);
	});

	it("works with small images", async () => {
		const result = await pdqRaw(makeGradientRGBA(64, 64), 64, 64);
		expect(result.type).toBe("pdq");
		expect(result.hash).toHaveLength(64);
	});

	describe("transform option", () => {
		it("returns a single hash string by default", async () => {
			const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256);
			expect(typeof result.hash).toBe("string");
		});

		it("returns 8 dihedral hashes when transform is true", async () => {
			const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256, { transform: true });
			expect(Array.isArray(result.hash)).toBe(true);
			expect(result.hash).toHaveLength(8);
		});

		it("produces the expected dihedral hashes for a gradient", async () => {
			const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256, { transform: true });
			const expected = [
				"5977ab28565d6d7f451240c0c6552ddf5557abaa54ab62355d7f052821d95a94",
				"02429d7d4a8a9505928b35dc8a46739bc6a051ed3e0bd9dd768e99cd17995dcd",
				"ee9a14d5ba6afeb648a20302aa63fbb4eaaa55d5d52aac46feba14a09b84295a",
				"295a9b8414a0febaac46d52a55d5eaaafbb4aa63030248a2feb6ba6a14d5ee9a",
				"b3ba99e8b399716ebb9bd07cb78a0563d9ce62513bacd149a0a95152beb94240",
				"5dcd179999cd768ed9dd3e0b51edc6a0739b8a4635dc928b95054a8a9d7d0242",
				"5a9421d905285d7f623554ababaa55572ddfc65540c045126d7f565dab285977",
				"4240beb95152a0a9d1493bac6251d9ce0563b78ad07cbb9b716eb39999e8b3ba",
			];
			expect(result.hash).toEqual(expected);
		});

		it("all 8 dihedral hashes are unique for non-symmetric images", async () => {
			const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256, { transform: true });
			const unique = new Set(result.hash as string[]);
			expect(unique.size).toBe(8);
		});

		it("all dihedral hashes are valid 64-char hex strings", async () => {
			const result = await pdqRaw(makeGradientRGBA(256, 256), 256, 256, { transform: true });
			for (const h of result.hash as string[]) {
				expect(h).toMatch(/^[0-9a-f]{64}$/);
			}
		});

		it("first dihedral hash matches the non-transform hash", async () => {
			const single = await pdqRaw(makeGradientRGBA(256, 256), 256, 256),
				multi = await pdqRaw(makeGradientRGBA(256, 256), 256, 256, { transform: true });
			expect((multi.hash as string[])[0]).toBe(single.hash);
		});
	});

	describe("passes option", () => {
		it("different pass counts produce different hashes", async () => {
			const data = makeCheckerRGBA(256, 256, 32),
				result1 = await pdqRaw(data, 256, 256, { passes: 1 }),
				result2 = await pdqRaw(data, 256, 256, { passes: 5 });
			expect(result1.hash).not.toBe(result2.hash);
		});
	});

	describe("reference image hashes", () => {
		const MAX_DISTANCE_PCT = 10,
			MAX_DISTANCE = Math.floor(256 * MAX_DISTANCE_PCT / 100),
			references: Record<string, { ref: string; quality: number }> = {
				"car.jpg": { ref: "681508e1741e6f29e872fc9c839846e3ccad3d1e17e1d06f780d60bf8776bf04", quality: 100 },
				"cat.jpg": { ref: "e9b19249cc766bb53209ecf66197922b19e66cd5972829a6cdc79e691239a9c2", quality: 100 },
				"party.jpg": { ref: "c8d9d62f2572995c23979b4b6ed8c4a74837bbca97e44a13ac0e02f562e1b50b", quality: 100 },
				"fotolia_884224.jpg": { ref: "decc629924990eacc6ec845e8c969fa28869a95c6d5726a936fe3a171cec1ccb", quality: 100 },
				"giphy.gif": { ref: "936cf0e6ce6c4b434d393d381cb9f093b0e6cb4bcf46312e2c2ce5b490f0ce39", quality: 100 },
				"80019.JPG": { ref: "fad8639fe66200e1286111e736f205c5bf113dc77f8bfb01d103e2b9a214767c", quality: 100 },
				"80141.JPG": { ref: "a25dba66099d6d2adaa9748f36669af2e9922d79a14a5f375260b2c76cd440b4", quality: 100 },
				"bordered.png": { ref: "a21ebb62ab994d0adba8648bb66699d2e9922d79a54adf27d260b2c76cdc40b4", quality: 100 },
				"black.png": { ref: "0000000000000000000000000000000000000000000000000000000000000000", quality: 0 },
			};

		for (const [filename, { ref }] of Object.entries(references)) {
			it(`${filename} is within ${MAX_DISTANCE_PCT}% of the reference hash`, async () => {
				const { data, width, height } = await loadImage(filename),
					result = await pdqRaw(data, width, height),
					dist = distance(result.hash as string, ref);
				expect(dist).toBeLessThanOrEqual(MAX_DISTANCE);
			});
		}

		for (const [filename, { quality }] of Object.entries(references)) {
			it(`${filename} produces quality ${quality}`, async () => {
				const { data, width, height } = await loadImage(filename),
					result = await pdqRaw(data, width, height);
				expect(result.quality).toBe(quality);
			});
		}

		it("all reference images produce distinct hashes", async () => {
			const hashes: string[] = [];
			for (const filename of Object.keys(references)) {
				const { data, width, height } = await loadImage(filename),
					result = await pdqRaw(data, width, height);
				hashes.push(result.hash as string);
			}
			expect(new Set(hashes).size).toBe(hashes.length);
		});
	});
});
