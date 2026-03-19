/**
 * vPDQ hash serialization and deserialization.
 *
 * Supports two formats:
 * 1. C++ format (line-per-feature): frameNumber,quality,hexHash,timestamp
 * 2. Python/JSON compact format: JSON array of "hexHash,quality,timestamp" strings
 */

import { Hash256 } from "./hash256";
import { VpdqFeature } from "./vpdqTypes";

const TIMESTAMP_PRECISION = 3;
const PDQ_HEX_STR_LEN = 64;

function featuresToCppFormat(features: VpdqFeature[]): string {
  return features
    .map(
      (f) =>
        `${f.frameNumber},${f.quality},${f.pdqHash.toHexString()},${f.timeStamp.toFixed(TIMESTAMP_PRECISION)}`
    )
    .join("\n");
}

function featuresFromCppFormat(text: string): VpdqFeature[] {
  const lines = text.trim().split("\n");
  return lines.filter(Boolean).map((line) => {
    const parts = line.split(",");
    if (parts.length < 4) {
      throw new Error(`Invalid vPDQ C++ format line: ${line}`);
    }
    const frameNumber = parseInt(parts[0], 10);
    const quality = parseInt(parts[1], 10);
    const pdqHash = Hash256.fromHexString(parts[2]);
    const timeStamp = parseFloat(parts[3]);
    return new VpdqFeature(pdqHash, frameNumber, quality, timeStamp);
  });
}

function featuresToJson(features: VpdqFeature[], indent?: number): string {
  const strings = features.map(
    (f) =>
      `${f.pdqHash.toHexString()},${f.quality},${f.timeStamp.toFixed(TIMESTAMP_PRECISION)}`
  );
  return JSON.stringify(strings, null, indent);
}

function featuresFromJson(jsonStr: string): VpdqFeature[] {
  if (!jsonStr) return [];
  const arr: string[] = JSON.parse(jsonStr);
  return arr.map((s, idx) => {
    const parts = s.split(",");
    if (parts.length !== 3) {
      throw new Error(`Invalid vPDQ JSON compact format: ${s}`);
    }
    const hexStr = parts[0];
    if (hexStr.length !== PDQ_HEX_STR_LEN) {
      throw new Error(`Invalid PDQ hash length: ${hexStr.length}`);
    }
    const pdqHash = Hash256.fromHexString(hexStr);
    const quality = parseInt(parts[1], 10);
    const timeStamp = parseFloat(parts[2]);
    return new VpdqFeature(pdqHash, idx, quality, timeStamp);
  });
}

function dedupeFeatures(features: VpdqFeature[]): VpdqFeature[] {
  const seen = new Set<string>();
  const result: VpdqFeature[] = [];
  for (const f of features) {
    const hex = f.pdqHash.toHexString();
    if (!seen.has(hex)) {
      seen.add(hex);
      result.push(f);
    }
  }
  return result;
}

function qualityFilterFeatures(features: VpdqFeature[], qualityTolerance: number): VpdqFeature[] {
  return features.filter((f) => f.quality >= qualityTolerance);
}

function prepareFeatures(features: VpdqFeature[], qualityTolerance: number): VpdqFeature[] {
  return dedupeFeatures(qualityFilterFeatures(features, qualityTolerance));
}

export {
  featuresToCppFormat,
  featuresFromCppFormat,
  featuresToJson,
  featuresFromJson,
  dedupeFeatures,
  qualityFilterFeatures,
  prepareFeatures,
  TIMESTAMP_PRECISION,
  PDQ_HEX_STR_LEN,
};
