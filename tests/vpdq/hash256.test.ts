import { describe, it, expect } from "vitest";
import { Hash256, popcount16 } from "../../src/hash256";

describe("popcount16", () => {
	it("returns 0 for 0", () => {
		expect(popcount16(0)).toBe(0);
	});

	it("returns 16 for 0xFFFF", () => {
		expect(popcount16(0xffff)).toBe(16);
	});

	it("returns 8 for 0xAAAA", () => {
		expect(popcount16(0xaaaa)).toBe(8);
	});

	it("returns 1 for powers of 2", () => {
		for (let i = 0; i < 16; i++) {
			expect(popcount16(1 << i)).toBe(1);
		}
	});
});

describe("Hash256", () => {
	it("constructor creates all-zero hash", () => {
		const h = new Hash256();
		expect(h.toHexString()).toBe("0".repeat(64));
	});

	describe("fromHexString / toHexString", () => {
		it("roundtrips correctly", () => {
			const hex = "a" + "0".repeat(63);
			const h = Hash256.fromHexString(hex);
			expect(h.toHexString()).toBe(hex);
		});

		it("roundtrips a known hash", () => {
			const hex = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
			expect(Hash256.fromHexString(hex).toHexString()).toBe(hex);
		});

		it("rejects non-64-char strings", () => {
			expect(() => Hash256.fromHexString("abc")).toThrow();
			expect(() => Hash256.fromHexString("a".repeat(65))).toThrow();
		});
	});

	describe("clear / setAll", () => {
		it("clear zeros all bits", () => {
			const h = new Hash256();
			h.setAll();
			h.clear();
			expect(h.toHexString()).toBe("0".repeat(64));
		});

		it("setAll sets all bits", () => {
			const h = new Hash256();
			h.setAll();
			expect(h.toHexString()).toBe("f".repeat(64));
		});
	});

	describe("bit operations", () => {
		it("setBit and getBit work for bit 0", () => {
			const h = new Hash256();
			h.setBit(0);
			expect(h.getBit(0)).toBe(1);
			expect(h.getBit(1)).toBe(0);
		});

		it("setBit and getBit work for bit 255", () => {
			const h = new Hash256();
			h.setBit(255);
			expect(h.getBit(255)).toBe(1);
			expect(h.getBit(254)).toBe(0);
		});

		it("clearBit clears a set bit", () => {
			const h = new Hash256();
			h.setBit(100);
			expect(h.getBit(100)).toBe(1);
			h.clearBit(100);
			expect(h.getBit(100)).toBe(0);
		});

		it("flipBit toggles a bit", () => {
			const h = new Hash256();
			h.flipBit(50);
			expect(h.getBit(50)).toBe(1);
			h.flipBit(50);
			expect(h.getBit(50)).toBe(0);
		});
	});

	describe("hammingDistance", () => {
		it("returns 0 for identical hashes", () => {
			const h = Hash256.fromHexString("ab".repeat(32));
			expect(h.hammingDistance(h.clone())).toBe(0);
		});

		it("returns 256 for all-zero vs all-one", () => {
			const zero = new Hash256();
			const ones = new Hash256();
			ones.setAll();
			expect(zero.hammingDistance(ones)).toBe(256);
		});

		it("returns 1 for a single bit flip", () => {
			const a = new Hash256();
			const b = new Hash256();
			b.setBit(42);
			expect(a.hammingDistance(b)).toBe(1);
		});
	});

	describe("hammingNorm", () => {
		it("returns 0 for zero hash", () => {
			expect(new Hash256().hammingNorm()).toBe(0);
		});

		it("returns 256 for all-one hash", () => {
			const h = new Hash256();
			h.setAll();
			expect(h.hammingNorm()).toBe(256);
		});
	});

	describe("bitwise operations", () => {
		it("xor of identical hashes is zero", () => {
			const h = Hash256.fromHexString("ab".repeat(32));
			const result = h.xor(h);
			expect(result.hammingNorm()).toBe(0);
		});

		it("and with zero is zero", () => {
			const h = Hash256.fromHexString("ff".repeat(32));
			const zero = new Hash256();
			expect(h.and(zero).hammingNorm()).toBe(0);
		});

		it("or with all-ones is all-ones", () => {
			const h = Hash256.fromHexString("ab".repeat(32));
			const ones = new Hash256();
			ones.setAll();
			expect(h.or(ones).hammingNorm()).toBe(256);
		});

		it("not inverts all bits", () => {
			const h = new Hash256();
			const notH = h.not();
			expect(notH.hammingNorm()).toBe(256);
		});

		it("double not is identity", () => {
			const h = Hash256.fromHexString("ab".repeat(32));
			expect(h.not().not().equals(h)).toBe(true);
		});
	});

	describe("equals", () => {
		it("returns true for identical hashes", () => {
			const hex = "ab".repeat(32);
			expect(Hash256.fromHexString(hex).equals(Hash256.fromHexString(hex))).toBe(true);
		});

		it("returns false for different hashes", () => {
			const a = Hash256.fromHexString("ab".repeat(32));
			const b = Hash256.fromHexString("cd".repeat(32));
			expect(a.equals(b)).toBe(false);
		});
	});

	describe("clone", () => {
		it("creates an independent copy", () => {
			const a = new Hash256();
			a.setBit(100);
			const b = a.clone();
			b.flipBit(100);
			expect(a.getBit(100)).toBe(1);
			expect(b.getBit(100)).toBe(0);
			expect(a.equals(b)).toBe(false);
		});

		it("clone equals original", () => {
			const a = Hash256.fromHexString("ab".repeat(32));
			expect(a.clone().equals(a)).toBe(true);
		});
	});
});
