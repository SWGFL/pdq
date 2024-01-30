export default (block: number, data: Uint8Array) => {
    let gradient = 0;
    for (let i = 0; i < block - 1; i++) {
        for (let j = 0; j < block; j++) {
            const u: any = data[i * block + j],
                v: any = data[(i + 1) * block + j],
                d: any = Math.round(((u - v) * 100) / 255);
            gradient += Math.abs(d);
        }
    }
    for (let i = 0; i < block; i++) {
        for (let j = 0; j < block - 1; j++) {
            const u: number = data[i * block + j],
                v: number = data[i * block + j + 1],
                d: number = Math.round(((u - v) * 100) / 255);
            gradient += Math.abs(d);
        }
    }

    // Heuristic scaling factor
    return Math.min(Math.round(gradient / 90), 100);
};
