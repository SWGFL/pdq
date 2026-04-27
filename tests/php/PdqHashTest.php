<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;
use swgfl\pdq\pdq;

class PdqHashTest extends TestCase {

	private const ASSETS = __DIR__ . '/../assets';
	private const MAX_DISTANCE_PCT = 10;
	private const MAX_DISTANCE = 25; // floor(256 * 10 / 100)

	private pdq $pdq;

	protected function setUp(): void {
		$this->pdq = new pdq();
	}

	public static function referenceImageProvider(): array {
		return [
			'car.jpg' => ['car.jpg', '681508e1741e6f29e872fc9c839846e3ccad3d1e17e1d06f780d60bf8776bf04', 100],
			'cat.jpg' => ['cat.jpg', 'e9b19249cc766bb53209ecf66197922b19e66cd5972829a6cdc79e691239a9c2', 100],
			'party.jpg' => ['party.jpg', 'c8d9d62f2572995c23979b4b6ed8c4a74837bbca97e44a13ac0e02f562e1b50b', 100],
			'fotolia_884224.jpg' => ['fotolia_884224.jpg', 'decc629924990eacc6ec845e8c969fa28869a95c6d5726a936fe3a171cec1ccb', 100],
			'giphy.gif' => ['giphy.gif', '936cf0e6ce6c4b434d393d381cb9f093b0e6cb4bcf46312e2c2ce5b490f0ce39', 100],
			'80019.JPG' => ['80019.JPG', 'fad8639fe66200e1286111e736f205c5bf113dc77f8bfb01d103e2b9a214767c', 100],
			'80141.JPG' => ['80141.JPG', 'a25dba66099d6d2adaa9748f36669af2e9922d79a14a5f375260b2c76cd440b4', 100],
			'bordered.png' => ['bordered.png', 'a21ebb62ab994d0adba8648bb66699d2e9922d79a54adf27d260b2c76cdc40b4', 100],
			'black.png' => ['black.png', '0000000000000000000000000000000000000000000000000000000000000000', 0],
		];
	}

	#[Test]
	#[DataProvider('referenceImageProvider')]
	public function hashIsWithinThresholdOfReference(string $filename, string $refHash, int $expectedQuality): void {
		$result = $this->pdq->run(self::ASSETS . '/' . $filename);
		$this->assertIsArray($result);
		$this->assertSame('pdq', $result['type']);
		$this->assertSame(64, \strlen($result['hash']));

		$dist = $this->pdq->hammingDistance($result['hash'], $refHash);
		$this->assertLessThanOrEqual(
			self::MAX_DISTANCE,
			$dist,
			\sprintf('%s: distance %d/%d (%.1f%%) exceeds %d%% threshold', $filename, $dist, 256, $dist / 256 * 100, self::MAX_DISTANCE_PCT)
		);
	}

	#[Test]
	#[DataProvider('referenceImageProvider')]
	public function qualityMatchesExpected(string $filename, string $refHash, int $expectedQuality): void {
		$result = $this->pdq->run(self::ASSETS . '/' . $filename);
		$this->assertSame($expectedQuality, $result['quality']);
	}

	#[Test]
	public function isDeterministic(): void {
		$file = self::ASSETS . '/cat.jpg';
		$result1 = $this->pdq->run($file);
		$result2 = $this->pdq->run($file);
		$this->assertSame($result1['hash'], $result2['hash']);
		$this->assertSame($result1['quality'], $result2['quality']);
	}

	#[Test]
	public function differentImagesProduceDifferentHashes(): void {
		$files = ['car.jpg', 'cat.jpg', 'party.jpg'];
		$hashes = [];
		foreach ($files as $file) {
			$result = $this->pdq->run(self::ASSETS . '/' . $file);
			$hashes[] = $result['hash'];
		}
		$this->assertCount(\count($hashes), \array_unique($hashes));
	}

	#[Test]
	public function allReferenceImagesProduceDistinctHashes(): void {
		$hashes = [];
		foreach (self::referenceImageProvider() as [$filename]) {
			$result = $this->pdq->run(self::ASSETS . '/' . $filename);
			$hashes[] = $result['hash'];
		}
		$this->assertCount(\count($hashes), \array_unique($hashes));
	}

	#[Test]
	public function returnsValidResultStructure(): void {
		$result = $this->pdq->run(self::ASSETS . '/car.jpg');
		$this->assertIsArray($result);
		$this->assertArrayHasKey('type', $result);
		$this->assertArrayHasKey('hash', $result);
		$this->assertArrayHasKey('quality', $result);
		$this->assertSame('pdq', $result['type']);
		$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $result['hash']);
		$this->assertIsInt($result['quality']);
		$this->assertGreaterThanOrEqual(0, $result['quality']);
		$this->assertLessThanOrEqual(100, $result['quality']);
	}

	#[Test]
	public function hashIs64HexCharacters(): void {
		$result = $this->pdq->run(self::ASSETS . '/cat.jpg');
		$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $result['hash']);
	}

	#[Test]
	public function transformReturnseightHashes(): void {
		$pdq = new pdq(['transform' => true]);
		$result = $pdq->run(self::ASSETS . '/party.jpg');
		$this->assertIsArray($result['hash']);
		$this->assertCount(8, $result['hash']);
		foreach ($result['hash'] as $hash) {
			$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $hash);
		}
		// all 8 should be unique
		$this->assertCount(8, \array_unique($result['hash']));
	}

	#[Test]
	public function transformFirstHashMatchesNonTransform(): void {
		$file = self::ASSETS . '/car.jpg';
		$single = (new pdq())->run($file);
		$multi = (new pdq(['transform' => true]))->run($file);
		$this->assertSame($single['hash'], $multi['hash'][0]);
	}

	#[Test]
	public function blackImageProducesZeroHash(): void {
		$result = $this->pdq->run(self::ASSETS . '/black.png');
		$this->assertSame(\str_repeat('0', 64), $result['hash']);
	}

	#[Test]
	public function blackImageHasZeroQuality(): void {
		$result = $this->pdq->run(self::ASSETS . '/black.png');
		$this->assertSame(0, $result['quality']);
	}

	#[Test]
	public function multipleFilesReturnMultipleResults(): void {
		$files = [self::ASSETS . '/car.jpg', self::ASSETS . '/cat.jpg'];
		$results = $this->pdq->run($files);
		$this->assertIsArray($results);
		$this->assertCount(2, $results);
		$this->assertSame('pdq', $results[0]['type']);
		$this->assertSame('pdq', $results[1]['type']);
	}

	#[Test]
	public function invalidFileReturnsFalse(): void {
		$result = @$this->pdq->run('/nonexistent/file.jpg');
		$this->assertFalse($result);
	}
}
