import distance from "./distance";
import {getConfig, VpdqFeature, type VpdqOptions} from "./vpdq";

export class VpdqMatchResult {
	queryMatchPercent: number;
	comparedMatchPercent: number;

	constructor(queryMatchPercent = 0.0, comparedMatchPercent = 0.0) {
		this.queryMatchPercent = queryMatchPercent;
		this.comparedMatchPercent = comparedMatchPercent;
	}
}

export interface IsMatchResult {
	isMatch: boolean;
	result: VpdqMatchResult;
}

function filterFeatures(features: VpdqFeature[], qualityTolerance: number): VpdqFeature[] {
	return features.filter(f => f.quality >= qualityTolerance);
}

function findMatches(features1: VpdqFeature[], features2: VpdqFeature[], distanceTolerance: number): number {
	let matchCount = 0;
	for (const f1 of features1) {
		for (const f2 of features2) {
			if (distance(f1.pdqHash, f2.pdqHash) < distanceTolerance) {
				matchCount++;
				break;
			}
		}
	}
	return matchCount;
}

function matchTwoHashBrute(
	queryHashes: VpdqFeature[],
	targetHashes: VpdqFeature[],
	opts: ReturnType<typeof getConfig>
): VpdqMatchResult {
	const queryFiltered = filterFeatures(queryHashes, opts.qualityTolerance),
		targetFiltered = filterFeatures(targetHashes, opts.qualityTolerance);
	let result = new VpdqMatchResult(0, 0);
	if (queryFiltered.length > 0 && targetFiltered.length > 0) {
		const qMatchCount = findMatches(queryFiltered, targetFiltered, opts.distanceTolerance),
			tMatchCount = findMatches(targetFiltered, queryFiltered, opts.distanceTolerance);
		result = new VpdqMatchResult(
			(qMatchCount * 100.0) / queryFiltered.length,
			(tMatchCount * 100.0) / targetFiltered.length
		);
	}
	return result;
}

export function compare(queryHashes: VpdqFeature[], targetHashes: VpdqFeature[], opts?: VpdqOptions): VpdqMatchResult {
	return matchTwoHashBrute(queryHashes, targetHashes, getConfig(opts));
}

export function isMatch(queryHashes: VpdqFeature[], targetHashes: VpdqFeature[], opts?: VpdqOptions): IsMatchResult {
	const options = getConfig(opts),
		result = matchTwoHashBrute(queryHashes, targetHashes, options);
	return {
		isMatch: result.comparedMatchPercent >= options.queryMatchThreshold && result.queryMatchPercent >= options.targetMatchThreshold,
		result
	};
}
