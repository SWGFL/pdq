<?php
require __DIR__.'/scripts/pdq.php';

function hammingDistance(string $hex1, string $hex2) : int {
	$a1 = hex2binCustom($hex1);
	$a2 = hex2binCustom($hex2);
	$dh = 0;
	for ($i = 0; $i < \strlen($a1); $i++) {
		if ($a1[$i] !== $a2[$i]) {
			$dh++;
		}
	}
	return $dh;
}

function hex2binCustom(string $hex) : string {
	$bin = [];
	foreach (\str_split($hex) AS $item) {
		$bin[] = \str_pad(\base_convert($item, 16, 2), 4, '0', STR_PAD_LEFT);
	}
	return \implode('', $bin);
}

$file = dirname(dirname(__DIR__)).'/stopncii-new/workspace/pdq/80019.JPG';
$compare = 'fad8639fe66200e1286111e736f205c5bf113dc77f8bfb01d103e2b9a214767c';
// $file = dirname(dirname(__DIR__)).'/swgfl/httpdocs/assets/articles/images/infographic-2-original.jpg';
// $compare = '06d80acdf2817912dbb9cb6c0dac6c035046f389d3fc377e545283ee5d23f453';
$show_timings = false;
$dump = false;
$downsample = true;
list($hash, $quality) = \PDQHasher::computeHashAndQualityFromFilename($file, $show_timings, $dump, $downsample);
$hex = $hash->toHexString();
$distance = hammingDistance($hex, $compare);
var_dump($hex, $quality, $distance);