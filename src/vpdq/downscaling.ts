/**
 * Image downscaling — re-exports from shared modules.
 */

export {
	fillFloatLumaFromRGBA,
	fillFloatLumaFromRGB,
	fillFloatLumaFromGrey,
} from "../luminance";

export {
	computeJaroszFilterWindowSize,
	jaroszFilterFloat,
	box1DFloat,
	boxAlongRowsFloat,
	boxAlongColsFloat,
} from "../jarosz-filter";

export { decimateFloat } from "../rescale";
