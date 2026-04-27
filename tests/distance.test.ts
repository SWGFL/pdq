import { describe, it, expect } from "vitest";
import distance from "../src/distance";

describe("distance", () => {
	it("returns 0 for identical hashes", () => {
		const hash = "a".repeat(64);
		expect(distance(hash, hash)).toBe(0);
	});

	it("returns 0 for two different identical hashes", () => {
		const hash1 = "abcdef0123456789".repeat(4),
			hash2 = "abcdef0123456789".repeat(4);
		expect(distance(hash1, hash2)).toBe(0);
	});

	it("returns correct distance for a single-bit difference", () => {
		// 0 = 0000, 1 = 0001 — one bit differs
		const hash1 = "0".repeat(64),
			hash2 = "1" + "0".repeat(63);
		expect(distance(hash1, hash2)).toBe(1);
	});

	it("returns correct distance for known hex pairs", () => {
		// f = 1111, 0 = 0000 — 4 bits differ per hex digit
		const hash1 = "f".repeat(64),
			hash2 = "0".repeat(64);
		expect(distance(hash1, hash2)).toBe(256);
	});

	it("counts bits correctly for a partial difference", () => {
		// 3 = 0011, c = 1100 — 4 bits differ
		const hash1 = "3" + "0".repeat(63),
			hash2 = "c" + "0".repeat(63);
		expect(distance(hash1, hash2)).toBe(4);
	});

	it("is commutative", () => {
		const hash1 = "abcdef0123456789".repeat(4),
			hash2 = "1234567890abcdef".repeat(4);
		expect(distance(hash1, hash2)).toBe(distance(hash2, hash1));
	});

	it("returns false for different-length hashes", () => {
		expect(distance("aabb", "aabbcc")).toBe(false);
	});

	it("returns false for empty vs non-empty", () => {
		expect(distance("", "aa")).toBe(false);
	});

	it("returns 0 for two empty strings", () => {
		expect(distance("", "")).toBe(0);
	});

	it("handles mixed-case hex consistently", () => {
		// a = 1010, A = 1010 — parseInt handles both
		const hash1 = "a".repeat(64),
			hash2 = "A".repeat(64);
		expect(distance(hash1, hash2)).toBe(0);
	});

	it("returns maximum distance (256) for complementary hashes", () => {
		// 5 = 0101, a = 1010 — all bits differ
		const hash1 = "5".repeat(64),
			hash2 = "a".repeat(64);
		expect(distance(hash1, hash2)).toBe(256);
	});

	it("works with realistic PDQ hash strings", () => {
		const hash1 = "297d4c4aaad577ff8a101200b49595bfa555ac24b2d5d695a5e7b19a496dba42",
			hash2 = "297d4c4aaad577ff8a101200b49595bfa555ac24b2d5d695a5e7b19a496dba42";
		expect(distance(hash1, hash2)).toBe(0);
	});
});
