/**
 * Brute-force vPDQ hash comparison.
 *
 * Compares two sets of video frame hashes and returns the percentage
 * of frames matched in each direction.
 */

import { VpdqFeature, VpdqMatchResult } from "./vpdqTypes";

function filterFeatures(features: VpdqFeature[], qualityTolerance: number): VpdqFeature[] {
  return features.filter((f) => f.quality >= qualityTolerance);
}

function findMatches(features1: VpdqFeature[], features2: VpdqFeature[], distanceTolerance: number): number {
  let matchCount = 0;
  for (const f1 of features1) {
    for (const f2 of features2) {
      if (f1.pdqHash.hammingDistance(f2.pdqHash) < distanceTolerance) {
        matchCount++;
        break;
      }
    }
  }
  return matchCount;
}

export interface IsMatchOptions {
  distanceTolerance?: number;
  qualityTolerance?: number;
  queryMatchThreshold?: number;
  targetMatchThreshold?: number;
}

export interface IsMatchResult {
  isMatch: boolean;
  result: VpdqMatchResult;
}

function matchTwoHashBrute(
  queryHashes: VpdqFeature[],
  targetHashes: VpdqFeature[],
  distanceTolerance: number,
  qualityTolerance: number
): VpdqMatchResult {
  const queryFiltered = filterFeatures(queryHashes, qualityTolerance);
  const targetFiltered = filterFeatures(targetHashes, qualityTolerance);

  if (queryFiltered.length === 0 || targetFiltered.length === 0) {
    return new VpdqMatchResult(0, 0);
  }

  const qMatchCount = findMatches(
    queryFiltered,
    targetFiltered,
    distanceTolerance
  );
  const tMatchCount = findMatches(
    targetFiltered,
    queryFiltered,
    distanceTolerance
  );

  const qMatch = (qMatchCount * 100.0) / queryFiltered.length;
  const tMatch = (tMatchCount * 100.0) / targetFiltered.length;

  return new VpdqMatchResult(qMatch, tMatch);
}

function isMatch(queryHashes: VpdqFeature[], targetHashes: VpdqFeature[], options: IsMatchOptions = {}): IsMatchResult {
  const {
    distanceTolerance = 31,
    qualityTolerance = 50,
    queryMatchThreshold = 80.0,
    targetMatchThreshold = 0.0,
  } = options;

  const result = matchTwoHashBrute(
    queryHashes,
    targetHashes,
    distanceTolerance,
    qualityTolerance
  );

  return {
    isMatch:
      result.comparedMatchPercent >= queryMatchThreshold &&
      result.queryMatchPercent >= targetMatchThreshold,
    result,
  };
}

export { matchTwoHashBrute, isMatch, filterFeatures };
