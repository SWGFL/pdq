/**
 * vPDQ video hashing pipeline.
 *
 * Extracts frames from video and computes PDQ hashes for each frame.
 *
 * Frame extraction strategies:
 * - Browser: Uses HTMLVideoElement + Canvas to seek and extract frames
 * - Node.js: Uses ffmpeg child process to extract frames
 */

import { pdqHashFromRGBA } from "./pdqhashing";
import { VpdqFeature } from "./vpdqTypes";

export interface FrameData {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  timestamp: number;
}

export interface HashVideoOptions {
  secondsPerHash?: number;
  pruneDistance?: number;
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

async function hashVideoUrl(videoUrl: string, options: HashVideoOptions = {}): Promise<VpdqFeature[]> {
  const { secondsPerHash = 1.0, pruneDistance } = options;

  if (typeof document === "undefined") {
    throw new Error("hashVideoUrl requires a browser environment with DOM");
  }

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.preload = "auto";

  await new Promise<Event>((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () =>
      reject(new Error(`Failed to load video: ${videoUrl}`));
    video.src = videoUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;

  const features: VpdqFeature[] = [];
  const duration = video.duration;
  let frameNumber = 0;

  for (
    let timeStamp = 0;
    timeStamp < duration;
    timeStamp += secondsPerHash, frameNumber++
  ) {
    await new Promise<Event>((resolve) => {
      video.onseeked = resolve;
      video.currentTime = timeStamp;
    });

    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const { hash, quality } = pdqHashFromRGBA(
      imageData.data,
      canvas.height,
      canvas.width
    );

    const feature = new VpdqFeature(hash, frameNumber, quality, timeStamp);

    if (pruneDistance !== undefined && features.length > 0) {
      const lastRetained = features[features.length - 1];
      if (hash.hammingDistance(lastRetained.pdqHash) <= pruneDistance) {
        continue;
      }
    }

    features.push(feature);
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

export { hashFrames, hashVideoUrl, pruneFrames };
