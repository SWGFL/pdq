/**
 * vPDQ frame hashing and pruning utilities.
 *
 * Frame extraction and hashVideoUrl live in src/vpdq.ts (the entry point).
 */

import { pdqHashFromRGBA } from "./pdqhashing";
import { VpdqFeature } from "./vpdqTypes";

export interface FrameData {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  timestamp: number;
}

function hashFrames(frames: FrameData[]): VpdqFeature[] {
  const features: VpdqFeature[] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const { hash, quality } = pdqHashFromRGBA(
      frame.data,
      frame.height,
      frame.width
    );
    features.push(new VpdqFeature(hash, i, quality, frame.timestamp));
  }
  return features;
}

function pruneFrames(features: VpdqFeature[], pruneDist: number): VpdqFeature[] {
  if (features.length === 0) return [];

  const result = [features[0]];
  for (let i = 1; i < features.length; i++) {
    const lastRetained = result[result.length - 1];
    if (features[i].pdqHash.hammingDistance(lastRetained.pdqHash) > pruneDist) {
      result.push(features[i]);
    }
  }
  return result;
}

export { hashFrames, pruneFrames };
