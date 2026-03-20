/**
 * vPDQ data types and constants for video frame hashing.
 */

import { Hash256 } from "./hash256";

class VpdqFeature {
  pdqHash: Hash256;
  frameNumber: number;
  quality: number;
  timeStamp: number;

  constructor(pdqHash: Hash256, frameNumber: number, quality: number, timeStamp: number) {
    this.pdqHash = pdqHash;
    this.frameNumber = frameNumber;
    this.quality = quality;
    this.timeStamp = timeStamp;
  }

  get hex(): string {
    return this.pdqHash.toHexString();
  }
}

class VpdqMatchResult {
  queryMatchPercent: number;
  comparedMatchPercent: number;

  constructor(queryMatchPercent = 0.0, comparedMatchPercent = 0.0) {
    this.queryMatchPercent = queryMatchPercent;
    this.comparedMatchPercent = comparedMatchPercent;
  }
}

const VPDQ_DISTANCE_THRESHOLD = 31;
const VPDQ_QUALITY_THRESHOLD = 50;
const VPDQ_QUERY_MATCH_THRESHOLD_PERCENT = 80.0;
const VPDQ_INDEX_MATCH_THRESHOLD_PERCENT = 0.0;

export {
  VpdqFeature,
  VpdqMatchResult,
  VPDQ_DISTANCE_THRESHOLD,
  VPDQ_QUALITY_THRESHOLD,
  VPDQ_QUERY_MATCH_THRESHOLD_PERCENT,
  VPDQ_INDEX_MATCH_THRESHOLD_PERCENT,
};
