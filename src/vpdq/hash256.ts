/**
 * 256-bit perceptual hash with Hamming distance support.
 *
 * Stored as 16 x 16-bit words to match the C++ reference implementation,
 * enabling interoperability with MIH data structures and the C++/Python
 * serialization formats.
 */

const HASH256_NUM_WORDS = 16;

function popcount16(x: number): number {
  x = x - ((x >> 1) & 0x5555);
  x = (x & 0x3333) + ((x >> 2) & 0x3333);
  x = (x + (x >> 4)) & 0x0f0f;
  return (x + (x >> 8)) & 0x1f;
}

class Hash256 {
  w: Uint16Array;

  constructor() {
    this.w = new Uint16Array(HASH256_NUM_WORDS);
  }

  static fromHexString(hex: string): Hash256 {
    if (hex.length !== 64) {
      throw new Error(
        `Hash256 hex string must be 64 characters, got ${hex.length}`
      );
    }
    const hash = new Hash256();
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      const hexOffset = (HASH256_NUM_WORDS - 1 - i) * 4;
      hash.w[i] = parseInt(hex.substring(hexOffset, hexOffset + 4), 16);
    }
    return hash;
  }

  toHexString(): string {
    let hex = "";
    for (let i = HASH256_NUM_WORDS - 1; i >= 0; i--) {
      hex += this.w[i].toString(16).padStart(4, "0");
    }
    return hex;
  }

  clear(): void {
    this.w.fill(0);
  }

  setAll(): void {
    this.w.fill(0xffff);
  }

  getBit(k: number): number {
    return (this.w[(k & 255) >> 4] >> (k & 15)) & 1;
  }

  setBit(k: number): void {
    this.w[(k & 255) >> 4] |= 1 << (k & 15);
  }

  clearBit(k: number): void {
    this.w[(k & 255) >> 4] &= ~(1 << (k & 15));
  }

  flipBit(k: number): void {
    this.w[(k & 255) >> 4] ^= 1 << (k & 15);
  }

  hammingDistance(that: Hash256): number {
    let dist = 0;
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      dist += popcount16(this.w[i] ^ that.w[i]);
    }
    return dist;
  }

  hammingNorm(): number {
    let n = 0;
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      n += popcount16(this.w[i]);
    }
    return n;
  }

  xor(that: Hash256): Hash256 {
    const rv = new Hash256();
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      rv.w[i] = this.w[i] ^ that.w[i];
    }
    return rv;
  }

  and(that: Hash256): Hash256 {
    const rv = new Hash256();
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      rv.w[i] = this.w[i] & that.w[i];
    }
    return rv;
  }

  or(that: Hash256): Hash256 {
    const rv = new Hash256();
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      rv.w[i] = this.w[i] | that.w[i];
    }
    return rv;
  }

  not(): Hash256 {
    const rv = new Hash256();
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      rv.w[i] = (~this.w[i]) & 0xffff;
    }
    return rv;
  }

  equals(that: Hash256): boolean {
    for (let i = 0; i < HASH256_NUM_WORDS; i++) {
      if (this.w[i] !== that.w[i]) return false;
    }
    return true;
  }

  clone(): Hash256 {
    const rv = new Hash256();
    rv.w.set(this.w);
    return rv;
  }
}

export { Hash256, HASH256_NUM_WORDS, popcount16 };
