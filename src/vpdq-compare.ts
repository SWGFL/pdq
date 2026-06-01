import distance from "./distance";
import {getConfig, type VpdqOptions} from "./vpdq";

export interface VpdqMatchResult {
	queryMatchPercent: number;
	comparedMatchPercent: number;
}

export interface IsMatchResult {
	isMatch: boolean;
	result: VpdqMatchResult;
}

type ParsedFeature = {hex: string; quality: number};

function parse(serialized: string, qualityTolerance: number): ParsedFeature[] {
	return (JSON.parse(serialized) as string[]).map(entry => {
		const [hex, quality] = entry.split(",");
		return {hex, quality: parseFloat(quality)};
	}).filter(f => f.quality >= qualityTolerance);
}

function findMatches(features1: ParsedFeature[], features2: ParsedFeature[], distanceTolerance: number): number {
	let matchCount = 0;
	for (const f1 of features1) {
		for (const f2 of features2) {
			const d = distance(f1.hex, f2.hex);
			if (d !== false && d < distanceTolerance) {
				matchCount++;
				break;
			}
		}
	}
	return matchCount;
}

export function compare(queryHashes: string, targetHashes: string, opts?: VpdqOptions): VpdqMatchResult {
	const options = getConfig(opts),
		queryFiltered = parse(queryHashes, options.qualityTolerance),
		targetFiltered = parse(targetHashes, options.qualityTolerance);
	let result: VpdqMatchResult = {queryMatchPercent: 0, comparedMatchPercent: 0};
	if (queryFiltered.length > 0 && targetFiltered.length > 0) {
		const qMatchCount = findMatches(queryFiltered, targetFiltered, options.distanceTolerance),
			tMatchCount = findMatches(targetFiltered, queryFiltered, options.distanceTolerance);
		result = {
			queryMatchPercent: qMatchCount * 100.0 / queryFiltered.length,
			comparedMatchPercent: tMatchCount * 100.0 / targetFiltered.length
		};
	}
	return result;
}

export function isMatch(queryHashes: string, targetHashes: string, opts?: VpdqOptions): IsMatchResult {
	const options = getConfig(opts),
		result = compare(queryHashes, targetHashes, opts);
	return {
		isMatch: result.comparedMatchPercent >= options.queryMatchThreshold && result.queryMatchPercent >= options.targetMatchThreshold,
		result
	};
}
