/**
 * vPDQ (Video PDQ) — TypeScript implementation.
 *
 * A video-similarity-detection algorithm that uses the PDQ perceptual
 * image hashing algorithm on video frames to measure video similarity.
 */

export { Hash256 } from "./hash256";

export { pdqHashFromRGBA, pdqHash256FromFloatLuma } from "./pdqhashing";
export type { PdqHashResult } from "./pdqhashing";

export {
  fillFloatLumaFromRGBA,
  fillFloatLumaFromRGB,
  fillFloatLumaFromGrey,
} from "./downscaling";

export {
  VpdqFeature,
  VpdqMatchResult,
  VPDQ_DISTANCE_THRESHOLD,
  VPDQ_QUALITY_THRESHOLD,
  VPDQ_QUERY_MATCH_THRESHOLD_PERCENT,
  VPDQ_INDEX_MATCH_THRESHOLD_PERCENT,
} from "./vpdqTypes";

export { matchTwoHashBrute, isMatch } from "./matchTwoHash";
export type { IsMatchOptions, IsMatchResult } from "./matchTwoHash";

export {
  featuresToCppFormat,
  featuresFromCppFormat,
  featuresToJson,
  featuresFromJson,
  dedupeFeatures,
  qualityFilterFeatures,
  prepareFeatures,
} from "./vpdqio";

export {
  hashFrames,
  pruneFrames,
} from "./vpdqHasher";
export type { FrameData } from "./vpdqHasher";
