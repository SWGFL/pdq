import jarosz from './jarosz-filter';
import render from './render';
import matrix from './matrix';
import hash from './hash-dct';
import luminance from './luminance';
import rescale from './rescale';
import dct from './dct';
import quality from './quality';

export default (canvas: HTMLCanvasElement, config: any) => {
    // merge default config
    config = Object.assign(
        {
            debug: false,
            passes: 2,
            block: 64,
        },
        config
    );

    // assign varables
    const block = config.block,
        debug = config.debug,
        width = canvas.width,
        height = canvas.height;
    let q: number;

    // extract the image data
    return (
        new Promise((success) => {
            // debug
            if (debug) {
                document.body.appendChild(canvas);
            }

            // Return the luminance data.
            success(
                canvas.getContext('2d')?.getImageData(0, 0, width, height).data
            );
        })

            // greyscale the image
            .then((data: unknown) => {
                const grey = luminance(data as Array<number>);

                // debug
                if (debug) {
                    render(width, height, grey);
                }

                // Return the luminance data.
                return grey;
            })

            // apply a two-pass jarosz box blur filter
            .then((data) => {
                const output = jarosz(data, width, height, config.passes);

                // debug
                if (debug) {
                    render(width, height, output);
                }
                return output;
            })

            // rescale the image to 64x64
            .then((data) => {
                // rescale
                const scaled = rescale(width, height, block, data);

                // debug
                if (debug) {
                    render(block, block, scaled);
                }
                return scaled;
            })

            // generate quality metric
            .then((data) => {
                q = quality(block, data);
                return data;
            })

            // generate 2D descrete cosine transform
            .then((data) => {
                const buffer16x16 = dct(data);

                // debug
                if (debug) {
                    console.log(buffer16x16);
                }
                return buffer16x16;
            })

            // rotate and flip DCTs
            .then((buffer) => {
                const dcts = {
                    original: buffer,
                    rot90: matrix.rotate(buffer),
                    flip: matrix.flip(buffer),
                    rot180: matrix.rotate(buffer),
                    rot270: matrix.rotate(buffer),
                    fliprot90: matrix.rotate(buffer),
                    fliprot180: matrix.rotate(buffer),
                    fliprot270: matrix.rotate(buffer),
                };
                dcts.rot180 = matrix.rotate(dcts.rot90);
                dcts.rot270 = matrix.rotate(dcts.rot180);
                dcts.fliprot90 = matrix.rotate(dcts.flip);
                dcts.fliprot180 = matrix.rotate(dcts.fliprot90);
                dcts.fliprot270 = matrix.rotate(dcts.fliprot180);

                // debug
                if (debug) {
                    console.log(dcts);
                }
                return dcts;
            })

            // compute hash from DCTs
            .then((dcts: { [k: number]: number[] }) => {
                const hashes: Array<string> = [];

                // generate hashes
                for (const item in dcts) {
                    const result = hash.computeDct(dcts[item]),
                        hex = hash.toHex(result);
                    hashes.push(hex);
                }
                return { type: 'pdq', hashes, quality: q };
            })
    );
};
