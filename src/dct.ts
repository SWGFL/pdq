/**
 *
 */
export default (data: ArrayLike<number>) => {
    const dct16x64 = Array(1024).fill(0),
        buffer16x16 = Array(125).fill(0),
        buffer16x64 = Array(1024).fill(0),
        scale = Math.sqrt(2.0 / 64.0);

    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 64; j++) {
            dct16x64[i * 64 + j] =
                scale * Math.cos((Math.PI / 2 / 64.0) * (i + 1) * (2 * j + 1));
        }
    }

    // 2D DCT:
    //   B = D A Dt
    // Split out into first product and second:
    //   B = (D A) Dt ; T = D A

    // build buffer16x64 from data
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 64; j++) {
            let sumk = 0.0;
            for (let k = 0; k < 64; k++) {
                sumk += dct16x64[i * 64 + k] * data[k * 64 + j];
            }
            buffer16x64[i * 64 + j] = sumk;
        }
    }

    // calculate buffer16x16 from buffer16x64
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
            let sumk = 0.0;
            for (let k = 0; k < 64; k++) {
                sumk += buffer16x64[i * 64 + k] * dct16x64[j * 64 + k];
            }
            buffer16x16[i * 16 + j] = sumk;
        }
    }
    return buffer16x16;
};
