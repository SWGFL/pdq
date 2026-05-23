function popcount16(x: number): number {
	x = x - ((x >> 1) & 0x5555);
	x = (x & 0x3333) + ((x >> 2) & 0x3333);
	x = (x + (x >> 4)) & 0x0f0f;
	return (x + (x >> 8)) & 0x1f;
}

function toWords(hash: string | Uint16Array): Uint16Array | false {
	if (hash instanceof Uint16Array) {
		return hash;
	}
	if (hash.length % 4 !== 0) {
		return false;
	}
	const words = new Uint16Array(hash.length / 4);
	for (let i = 0; i < words.length; i++) {
		words[i] = parseInt(hash.substring(i * 4, i * 4 + 4), 16);
	}
	return words;
}

function distance(hash1: Uint16Array, hash2: Uint16Array): number;
function distance(hash1: string, hash2: string): number | false;
function distance(hash1: string | Uint16Array, hash2: string | Uint16Array): number | false {
	const w1 = toWords(hash1),
		w2 = toWords(hash2);
	let result: number | false = false;
	if (w1 !== false && w2 !== false && w1.length === w2.length) {
		let dist = 0;
		for (let i = 0; i < w1.length; i++) {
			dist += popcount16(w1[i] ^ w2[i]);
		}
		result = dist;
	}
	return result;
}

export default distance;
