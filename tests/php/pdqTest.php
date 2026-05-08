<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use swgfl\pdq\pdq;

/**
 * Tests for the PDQ perceptual-hash implementation.
 *
 * Most of the algorithm is protected; we exercise the public API (`run`,
 * `hammingDistance`, `getBitDiff`) end-to-end and reach into protected
 * helpers via callProtectedMethod for the pure maths
 * (matrix rotation/flip, hex encoding, DCT thresholding).
 */
final class pdqTest extends TestCase {

	private static function callProtectedMethod(object $obj, string $method, array $args = []): mixed {
		$ref = new \ReflectionMethod($obj, $method);
		return $ref->invokeArgs($obj, $args);
	}

	// ---------------------------------------------------------------
	// hex2binCustom — hex digit → 4-bit binary string
	// ---------------------------------------------------------------

	public static function hex2binProvider(): array {
		return [
			'zero'      => ['0', '0000'],
			'one'       => ['1', '0001'],
			'ten'       => ['a', '1010'],
			'fifteen'   => ['f', '1111'],
			'pair low'  => ['a5', '10100101'],
			'pair high' => ['ff', '11111111'],
			'sequence'  => ['0123', '0000000100100011'],
		];
	}

	#[DataProvider('hex2binProvider')]
	public function testHex2binCustomExpandsEachNibbleToFourBits(string $hex, string $expected): void {
		$obj = new pdq();
		$this->assertSame($expected, self::callProtectedMethod($obj, 'hex2binCustom', [$hex]));
	}

	// ---------------------------------------------------------------
	// toHex — reverses byte order then hex-encodes
	// ---------------------------------------------------------------

	public function testToHexReversesByteOrderBeforeEncoding(): void {
		$obj = new pdq();
		// Two bytes: 0xAB, 0xCD — when reversed becomes CD,AB → 'cdab'
		$this->assertSame('cdab', self::callProtectedMethod($obj, 'toHex', [[0xAB, 0xCD]]));
	}

	public function testToHexMasksValuesToSingleByte(): void {
		$obj = new pdq();
		// 0x1FF & 0xFF = 0xFF, not 0x100; ensures the mask is applied
		$this->assertSame('ff', self::callProtectedMethod($obj, 'toHex', [[0x1FF]]));
	}

	public function testToHexPadsSingleDigitBytes(): void {
		$obj = new pdq();
		$this->assertSame('0f0a0100', self::callProtectedMethod($obj, 'toHex', [[0x00, 0x01, 0x0A, 0x0F]]));
	}

	// ---------------------------------------------------------------
	// rotateMatrix — 90° clockwise on a square matrix stored 1D
	// ---------------------------------------------------------------

	public function testRotateMatrixFourRotationsIsIdentity(): void {
		$obj = new pdq();
		// 4×4 matrix of unique values
		$data = \range(1, 16);
		$rotated = $data;
		for ($i = 0; $i < 4; $i++) {
			$rotated = self::callProtectedMethod($obj, 'rotateMatrix', [$rotated]);
		}
		$this->assertSame($data, $rotated, 'Four 90° rotations should return the original matrix');
	}

	public function testRotateMatrixProducesExpected90DegreeResult(): void {
		$obj = new pdq();
		//  1  2         3  1
		//  3  4   →     4  2
		$input    = [1, 2, 3, 4];
		$expected = [3, 1, 4, 2];
		$this->assertSame($expected, self::callProtectedMethod($obj, 'rotateMatrix', [$input]));
	}

	// ---------------------------------------------------------------
	// flipMatrix — horizontal flip on a square matrix stored 1D
	// ---------------------------------------------------------------

	public function testFlipMatrixTwoFlipsIsIdentity(): void {
		$obj = new pdq();
		$data    = \range(1, 16);
		$flipped = self::callProtectedMethod($obj, 'flipMatrix', [$data]);
		$twice   = self::callProtectedMethod($obj, 'flipMatrix', [$flipped]);
		$this->assertSame($data, $twice);
	}

	public function testFlipMatrixMirrorsRowsHorizontally(): void {
		$obj = new pdq();
		//  1  2  3         3  2  1
		//  4  5  6   →     6  5  4
		//  7  8  9         9  8  7
		$input    = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		$expected = [3, 2, 1, 6, 5, 4, 9, 8, 7];
		$this->assertSame($expected, self::callProtectedMethod($obj, 'flipMatrix', [$input]));
	}

	// ---------------------------------------------------------------
	// computeDct — returns a 32-byte (256-bit) hash from 256 floats
	// ---------------------------------------------------------------

	public function testComputeDctReturnsThirtyTwoBytes(): void {
		$obj = new pdq();
		// 256-element array with a clear median at 128
		$data = \range(1, 256);
		$hash = self::callProtectedMethod($obj, 'computeDct', [$data]);
		$this->assertIsArray($hash);
		$this->assertCount(32, $hash);
	}

	public function testComputeDctSetsBitsOnlyWhereValueExceedsMedian(): void {
		$obj = new pdq();

		// Construct data where 128 values are above a known threshold and 128 below.
		// With values 1..256, the sorted[127] element is 128, so anything > 128 sets a bit.
		$data = \range(1, 256);
		$hash = self::callProtectedMethod($obj, 'computeDct', [$data]);

		// Count set bits across all 32 bytes; should be exactly 128.
		$bitsSet = 0;
		foreach ($hash as $byte) {
			$bitsSet += \substr_count(\decbin($byte), '1');
		}
		$this->assertSame(128, $bitsSet, 'Exactly half the bits should be above the median');
	}

	// ---------------------------------------------------------------
	// hammingDistance — bit-level distance between two hex strings
	// ---------------------------------------------------------------

	public function testHammingDistanceOfIdenticalHashesIsZero(): void {
		$obj = new pdq();
		$this->assertSame(0, $obj->hammingDistance('deadbeef', 'deadbeef'));
	}

	public function testHammingDistanceCountsBitLevelDifferences(): void {
		$obj = new pdq();
		// '0' = 0000 vs '1' = 0001 → 1 bit differs
		$this->assertSame(1, $obj->hammingDistance('0', '1'));
		// 'a' = 1010 vs '5' = 0101 → 4 bits differ
		$this->assertSame(4, $obj->hammingDistance('a', '5'));
		// 'f' = 1111 vs '0' = 0000 → 4 bits differ
		$this->assertSame(4, $obj->hammingDistance('f', '0'));
	}

	public function testHammingDistanceAccumulatesAcrossCharacters(): void {
		$obj = new pdq();
		// 'ff' = 11111111 vs '00' = 00000000 → 8 bits
		$this->assertSame(8, $obj->hammingDistance('ff', '00'));
		// 'ff00' vs '00ff' → 16 bits
		$this->assertSame(16, $obj->hammingDistance('ff00', '00ff'));
	}

	// ---------------------------------------------------------------
	// run() — end-to-end with a synthetic GdImage
	// ---------------------------------------------------------------

	/**
	 * Builds a deterministic 256×256 GD image with a recognisable pattern
	 * (gradient + diagonal stripe) so that a bug in the pipeline shifts
	 * the hash rather than silently producing a valid-looking constant.
	 */
	private function makeFixtureImage(int $seed = 0): \GdImage {
		$img = \imagecreatetruecolor(256, 256);
		for ($y = 0; $y < 256; $y++) {
			for ($x = 0; $x < 256; $x++) {
				$r = ($x + $seed) & 0xFF;
				$g = ($y + $seed) & 0xFF;
				$b = (($x ^ $y) + $seed) & 0xFF;
				\imagesetpixel($img, $x, $y, \imagecolorallocate($img, $r, $g, $b));
			}
		}
		return $img;
	}

	public function testRunReturnsExpectedResultStructure(): void {
		$obj = new pdq();
		$result = $obj->run($this->makeFixtureImage());

		$this->assertIsArray($result);
		$this->assertSame('pdq', $result['type']);
		$this->assertArrayHasKey('hash', $result);
		$this->assertArrayHasKey('quality', $result);
		$this->assertArrayHasKey('time', $result);
	}

	public function testRunProducesA64CharHexHashWithoutTransform(): void {
		$obj = new pdq();
		$result = $obj->run($this->makeFixtureImage());

		$this->assertIsString($result['hash']);
		$this->assertSame(64, \strlen($result['hash']));
		$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $result['hash']);
	}

	public function testRunProducesEightHashesWhenTransformEnabled(): void {
		$obj = new pdq(['transform' => true]);
		$result = $obj->run($this->makeFixtureImage());

		$this->assertIsArray($result['hash']);
		$this->assertCount(8, $result['hash']);
		foreach ($result['hash'] as $hash) {
			$this->assertSame(64, \strlen($hash));
			$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $hash);
		}
	}

	public function testRunQualityIsZeroToOneHundred(): void {
		$obj = new pdq();
		$result = $obj->run($this->makeFixtureImage());

		$this->assertIsInt($result['quality']);
		$this->assertGreaterThanOrEqual(0, $result['quality']);
		$this->assertLessThanOrEqual(100, $result['quality']);
	}

	public function testRunIsDeterministicForSameInput(): void {
		$obj = new pdq();
		$first  = $obj->run($this->makeFixtureImage());
		$second = $obj->run($this->makeFixtureImage());

		$this->assertSame($first['hash'], $second['hash'], 'Identical images must produce identical hashes');
	}

	public function testRunProducesDifferentHashForDifferentImage(): void {
		$obj = new pdq();
		$a = $obj->run($this->makeFixtureImage(0));
		$b = $obj->run($this->makeFixtureImage(100));

		$this->assertNotSame($a['hash'], $b['hash'], 'Visibly different images should produce different hashes');
	}

	public function testRunAcceptsArrayInputAndReturnsArrayOfResults(): void {
		$obj = new pdq();
		$results = $obj->run([$this->makeFixtureImage(0), $this->makeFixtureImage(50)]);

		$this->assertIsArray($results);
		$this->assertArrayHasKey(0, $results);
		$this->assertArrayHasKey(1, $results);
		$this->assertSame('pdq', $results[0]['type']);
		$this->assertSame('pdq', $results[1]['type']);
		$this->assertNotSame($results[0]['hash'], $results[1]['hash']);
	}

	// ---------------------------------------------------------------
	// Round-trip: transform hashes should be self-consistent
	// ---------------------------------------------------------------

	public function testTransformHashesIncludeOriginalAsFirstElement(): void {
		$obj = new pdq(['transform' => true]);
		$resultWith  = $obj->run($this->makeFixtureImage());
		$resultPlain = (new pdq())->run($this->makeFixtureImage());

		$this->assertSame($resultPlain['hash'], $resultWith['hash'][0],
			'First transform hash should equal the non-transform hash');
	}
}
