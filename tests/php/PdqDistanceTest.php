<?php
declare(strict_types=1);
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use swgfl\pdq\pdq;

class PdqDistanceTest extends TestCase {

	private pdq $pdq;

	protected function setUp(): void {
		$this->pdq = new pdq();
	}

	#[Test]
	public function identicalHashesReturnZero(): void {
		$hash = \str_repeat('a', 64);
		$this->assertSame(0, $this->pdq->hammingDistance($hash, $hash));
	}

	#[Test]
	public function singleBitDifference(): void {
		// 0 = 0000, 1 = 0001
		$hash1 = \str_repeat('0', 64);
		$hash2 = '1' . \str_repeat('0', 63);
		$this->assertSame(1, $this->pdq->hammingDistance($hash1, $hash2));
	}

	#[Test]
	public function complementaryHashesReturn256(): void {
		// f = 1111, 0 = 0000
		$hash1 = \str_repeat('f', 64);
		$hash2 = \str_repeat('0', 64);
		$this->assertSame(256, $this->pdq->hammingDistance($hash1, $hash2));
	}

	#[Test]
	public function partialDifference(): void {
		// 3 = 0011, c = 1100 — 4 bits differ
		$hash1 = '3' . \str_repeat('0', 63);
		$hash2 = 'c' . \str_repeat('0', 63);
		$this->assertSame(4, $this->pdq->hammingDistance($hash1, $hash2));
	}

	#[Test]
	public function isCommutative(): void {
		$hash1 = \str_repeat('abcdef0123456789', 4);
		$hash2 = \str_repeat('1234567890abcdef', 4);
		$this->assertSame(
			$this->pdq->hammingDistance($hash1, $hash2),
			$this->pdq->hammingDistance($hash2, $hash1)
		);
	}

	#[Test]
	public function allBitsDifferWith5andA(): void {
		// 5 = 0101, a = 1010
		$hash1 = \str_repeat('5', 64);
		$hash2 = \str_repeat('a', 64);
		$this->assertSame(256, $this->pdq->hammingDistance($hash1, $hash2));
	}

	#[Test]
	public function realisticPdqHashesIdentical(): void {
		$hash = '297d4c4aaad577ff8a101200b49595bfa555ac24b2d5d695a5e7b19a496dba42';
		$this->assertSame(0, $this->pdq->hammingDistance($hash, $hash));
	}

	#[Test]
	public function emptyStringsReturnZero(): void {
		$this->assertSame(0, $this->pdq->hammingDistance('', ''));
	}

	#[Test]
	public function differentLengthsReturnFalse(): void {
		$hash1 = \str_repeat('a', 64);
		$hash2 = \str_repeat('a', 32);
		$this->assertFalse($this->pdq->hammingDistance($hash1, $hash2));
	}
}
