export default {
    computeDct: (dct: Array<any>) => {
        // get the middle value
        const median = [...dct].sort((a, b) => a - b)[127];

        // extract bits
        const hash = new Uint8Array(32);
        dct.forEach((value, i) => {
            hash[Math.floor(i / 8)] |= (value > median ? 1 : 0) << i % 8;
        });
        return hash;
    },
    toHex: (bytes: ArrayLike<any>) =>
        Array.from(bytes, (byte) =>
            ('0' + (byte & 0xff).toString(16)).slice(-2)
        )
            .reverse()
            .join(''),
};
