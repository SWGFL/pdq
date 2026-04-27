function hex2bin(hash: string): string[] {
	return hash.split("").map((letter: string) => parseInt(letter, 16).toString(2).padStart(4, "0")).join("").split("");
}

export default (hash1: string, hash2: string) => {
	if (hash1.length === hash2.length) {
		const bin1 = hex2bin(hash1),
			bin2 = hex2bin(hash2);
		return bin1.reduce((dist, bit, i) => dist + (bit !== bin2[i] ? 1 : 0), 0);
	}
	return false;
};