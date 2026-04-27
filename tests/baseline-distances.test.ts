import { describe, it } from "vitest";
import { resolve } from "path";
import sharp from "sharp";
import { pdqRaw } from "../src/pdq";
import distance from "../src/distance";

const ASSETS = resolve(__dirname, "assets");

async function loadImage(filename: string) {
	const image = sharp(resolve(ASSETS, filename)),
		{ width, height } = await image.metadata(),
		data = await image.raw().ensureAlpha().toBuffer();
	return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: width!, height: height! };
}

const references: Record<string, string> = {
	"car.jpg": "681508e1741e6f29e872fc9c839846e3ccad3d1e17e1d06f780d60bf8776bf04",
	"cat.jpg": "e9b19249cc766bb53209ecf66197922b19e66cd5972829a6cdc79e691239a9c2",
	"party.jpg": "c8d9d62f2572995c23979b4b6ed8c4a74837bbca97e44a13ac0e02f562e1b50b",
	"fotolia_884224.jpg": "decc629924990eacc6ec845e8c969fa28869a95c6d5726a936fe3a171cec1ccb",
	"giphy.gif": "936cf0e6ce6c4b434d393d381cb9f093b0e6cb4bcf46312e2c2ce5b490f0ce39",
	"80019.JPG": "fad8639fe66200e1286111e736f205c5bf113dc77f8bfb01d103e2b9a214767c",
	"80141.JPG": "a25dba66099d6d2adaa9748f36669af2e9922d79a14a5f375260b2c76cd440b4",
	"bordered.png": "a21ebb62ab994d0adba8648bb66699d2e9922d79a54adf27d260b2c76cdc40b4",
	"black.png": "0000000000000000000000000000000000000000000000000000000000000000",
};

describe("baseline distances", () => {
	for (const [filename, ref] of Object.entries(references)) {
		it(`${filename}`, async () => {
			const { data, width, height } = await loadImage(filename),
				result = await pdqRaw(data, width, height),
				dist = distance(result.hash as string, ref);
			console.log(`${filename.padEnd(25)} hash=${result.hash}  dist=${String(dist).padStart(3)}  quality=${result.quality}`);
		});
	}
});
