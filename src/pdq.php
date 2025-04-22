<?php
declare(strict_types=1);
namespace swgfl\pdq;

class pdq {

	// Default configuration
	protected array $config = [
		'debug' => false,
		'passes' => 2,
		'block' => 64,
		'scale' => 512,
		'divisor' => 128, // jarosz filter divisor
		'transform' => false
	];

	protected array $steps = [];

	public function __construct(array $config = []) {
		$this->config = \array_merge($this->config, $config);
		$this->steps = [];
	}

	/**
	 * Main function to process images and generate PDQ hashes
	 * 
	 * @param array $files Files from $_FILES
	 * @param bool $compare Whether to compare against reference
	 * @param bool $debug Enable debug output
	 * @return array Results with images and hash data
	 */
	public function run(array|string $files, ?string &$error = null) : array|false {
		
		// normalise array
		if (!\is_array($files)) {
			$files = [$files];
		}

		// parameters
		$scale = $this->config['scale'];

		$output = [];
		foreach ($files AS $item) {
			\set_time_limit(60);
			
			// Load the image
			if (($image = $this->loadImageFromFile($item)) === false) {
				$error = 'The file requested is not a valid image';
				return false;

			// resize the image to a square
			} elseif (($image = $this->resizeSquare($image, $scale)) === false) {
				$error = 'Unable to resize image';
				return false;

			// make the image greyscale
			} elseif (($data = $this->luminance($image)) === false) {
				$error = 'Unable to extract pixel data';
				return false;

			// 2 pass box blur filter
			} elseif (($data['data'] = $this->jaroszFilter($data['data'], $data['width'], $data['height'], $this->config['passes'])) === false) {
				$error = 'Unable to apply blur filter';
				return false;

			// scale down to 64x64
			} elseif (($data = $this->rescale($data['data'], $data['width'], $data['height'], $this->config['block'])) === false) {
				$error = 'Unable to resize image';
				return false;

			// calculate quality metric
			} elseif (($quality = $this->calculateQuality($data, $this->config['block'])) === false) {
				$error = 'Unable to generate quality metric';
				return false;

			// create discrete cosine transform
			} elseif (($dct = $this->dct($data)) === false) {
				$error = 'Unable to generate discrete cosine transform';
				return false;

			// generate hash and dihedral transforms
			} elseif (($hashes = $this->generateHashes($dct, $this->config['transform'])) === false) {
				$error = 'Unable to generate hashes';
				return false;

			// store result
			} else {
				$output[] = [
					'type' => 'pdq',
					'hash' => $hashes,
					'quality' => $quality,
					'steps' => $this->steps
				];
			}
		}
		
		return isset($output[1]) ? $output : $output[0];
	}
	
	/**
	 * Load an image from a file
	 */
	protected function loadImageFromFile(string $file) : \GdImage|false {
		$type = \mime_content_type($file);
		if ($type === 'image/jpg' || $type === 'image/jpeg') {
			return \imagecreatefromjpeg($file);
		} else if ($type === 'image/png') {
			return \imagecreatefrompng($file);
		} else if ($type === 'image/gif') {
			return \imagecreatefromgif($file);
		} else {
			throw new \Exception('Unsupported file format');
		}
		return false;
	}
	
	/**
	 * Create a square image by resizing the image to fit in a square
	 * This "squashes" the image to the target dimensions, changing aspect ratio
	 * 
	 * @param \GdImage $image Source image
	 * @param int $size Target square size
	 * @return \GdImage Square image
	 */
	protected function resizeSquare(\GdImage $image, int $size) : \GdImage|false {
		$width = \imagesx($image);
		$height = \imagesy($image);
		
		// Cap the size to the smaller dimension or the maximum size
		$dim = \min($width, $height, $size);
		
		// Create new square image
		$square = \imagecreatetruecolor($dim, $dim);
		
		// Preserve transparency if needed
		\imagealphablending($square, false);
		\imagesavealpha($square, true);
		$transparent = \imagecolorallocatealpha($square, 255, 255, 255, 127);
		\imagefilledrectangle($square, 0, 0, $dim, $dim, $transparent);
		
		// Copy and resize the entire image to the square (this will distort the aspect ratio)
		if (\imagecopyresampled($square, $image, 0, 0, 0, 0, $dim, $dim, $width, $height)) { 
			if ($this->config['debug']) {
				$this->render($square);
			}
			return $square;
		}
		return false;
	}

	protected function render(\GdImage $image, ?string &$error = null) : void {
		if (($handle = \fopen('php://memory', 'w')) === false) {
			$error = "Couldn't create image stream";
		} elseif (!\imagepng($image, $handle)) {
			$error = "Couldn't create image from stream";
		} elseif (!\rewind($handle)) {
			$error = "Couldn't create rewind stream";
		} elseif (($png = \stream_get_contents($handle)) === false) {
			$error = "Couldn't read contents from stream";
		} else {
			echo '<img src="data:image/png;base64,'.\base64_encode($png).'" width="" height="" />';
			\fclose($handle);
		}
	}
	
	/**
	 * Convert RGBA image data to luminance (grayscale)
	 */
	protected function luminance(\GdImage $image) : array {
		$luma = [
			'r' => 0.299,
			'g' => 0.587,
			'b' => 0.114
		];
		$data = [
			'width' => \imagesx($image),
			'height' => \imagesy($image),
			'data' => []
		];
		
		for ($y = 0; $y < $data['height']; $y++) {
			for ($x = 0; $x < $data['width']; $x++) {
				$rgb = \imagecolorat($image, $x, $y);
				$r = ($rgb >> 16) & 0xFF;
				$g = ($rgb >> 8) & 0xFF;
				$b = $rgb & 0xFF;
				$data['data'][] = $luma['r'] * $r + $luma['g'] * $g + $luma['b'] * $b;
			}
		}

		if ($this->config['debug']) {
			$this->renderData($data['data'], $data['width'], $data['height']);
		}
		$this->steps['luminance'] = $data['data'];
		return $data;
	}
	
	/**
	 * Convert image data back to a GD image
	 */
	protected function renderData(array $data, int $width, int $height) : void {
		$image = \imagecreatetruecolor($width, $height);
		for ($y = 0; $y < $height; $y++) {
			for ($x = 0; $x < $width; $x++) {
				$luma = \intval(\round($data[$y * $width + $x]));
				$color = \imagecolorallocate($image, $luma, $luma, $luma);
				\imagesetpixel($image, $x, $y, $color);
			}
		}
		$this->render($image);
	}
	
	/**
	 * Apply Jarosz box blur filter
	 */
	protected function jaroszFilter(array $data, int $width, int $height, int $passes) : array {

		// Calculate window sizes
		$divisor = $this->config['divisor'];
		$xblur = \intval(($width + $divisor - 1) / $divisor);
		$yblur = \intval(($height + $divisor - 1) / $divisor);
		
		$output = \array_fill(0, \count($data), 0);
		
		// Apply filter
		for ($k = 0; $k < $passes; $k++) {
			$output = $this->boxBlurRows($data, $output, $height, $width, $xblur);
			$output = $this->boxBlurColumns($output, $data, $height, $width, $yblur);
		}

		if ($this->config['debug']) {
			$this->renderData($output, $width, $height);
		}
		$this->steps['jaroszFilter'] = $output;
		return $output;
	}
	
	protected function boxBlurRows(array $input, array $output, int $width, int $height, int $radius) : array {
		$iarr = 1 / ($radius + $radius + 1); // convolution matrix value - constant for box blur
	
		// loop through each row
		for ($i = 0; $i < $height; $i++) {
			$ti = $i * $width;
			$li = $ti;
			$ri = $ti + $radius;
			$fv = $input[$ti];
			$lv = $input[$ti + $width - 1];
			$val = ($radius + 1) * $fv;
	
			// add up from the left to the $radius - reflecting the missing data
			for ($j = 0; $j < $radius; $j++) {
				$val += $input[$ti + $j];
			}
	
			// average the $radius of pixels
			for ($j = 0; $j <= $radius; $j++) {
				$val += $input[$ri++] - $fv;
				$output[$ti++] = $val * $iarr;
			}
			
			// take a floating average from {$radius} to {$width - $radius}
			for ($j = $radius + 1; $j < $width - $radius; $j++) {
				$val += $input[$ri++] - $input[$li++];
				$output[$ti++] = $val * $iarr;
			}
			
			// average out the last {$radius} pixels
			for ($j = 0; $j < $radius; $j++) {
				$val += $lv - $input[$li++];
				$output[$ti++] = $val * $iarr;
			}
		}
		return $output;
	}
	
	protected function boxBlurColumns(array $input, array $output, int $width, int $height, int $radius) : array {
		$iarr = 1 / ($radius + $radius + 1); // convolution matrix value - constant for box blur
	
		// loop through each column
		for ($i = 0; $i < $width; $i++) {
			$ti = $i;
			$li = $ti;
			$ri = $ti + $radius * $width;
			$fv = $input[$ti];
			$lv = $input[$ti + $width * ($height - 1)];
			$val = ($radius + 1) * $fv;
	
			// add up from the top to the $radius - reflecting the missing data
			for ($j = 0; $j < $radius; $j++) {
				$val += $input[$ti + $j * $width];
			}
	
			// average the $radius of pixels
			for ($j = 0; $j <= $radius; $j++) {
				$val += $input[$ri] - $fv;
				$output[$ti] = $val * $iarr;
				$ri += $width;
				$ti += $width;
			}
			
			// take a floating average from {$radius} to {$height - $radius}
			for ($j = $radius + 1; $j < $height - $radius; $j++) {
				$val += $input[$ri] - $input[$li];
				$output[$ti] = $val * $iarr;
				$li += $width;
				$ri += $width;
				$ti += $width;
			}
			
			// average out the last {$radius} pixels
			for ($j = 0; $j < $radius; $j++) {
				$val += $lv - $input[$li];
				$output[$ti] = $val * $iarr;
				$li += $width;
				$ti += $width;
			}
		}
		return $output;
	}
	
	/**
	 * Rescale image data to specific block size
	 * This uses the same middle-pixel selection approach as the JS implementation
	 */
	protected function rescale(array $data, int $width, int $height, int $block) : array {
		$scaled = \array_fill(0, $block * $block, 0);
		$halfwidth = $width / $block / 2;
		$halfheight = $height / $block / 2;
		
		for ($i = 0; $i < $block; $i++) {
			for ($j = 0; $j < $block; $j++) {
				$x = \intval(\round(($i * $width) / $block + $halfwidth));
				$y = \intval(\round(($j * $height) / $block + $halfheight));
				$scaled[($j * $block) + $i] = $data[($y * $width) + $x];
			}
		}

		if ($this->config['debug']) {
			$this->renderData($scaled, $block, $block);
		}
		$this->steps['64x64'] = $scaled;
		return $scaled;
	}
	
	/**
	 * Calculate image quality metric
	 */
	protected function calculateQuality(array $data, int $block) : int {
		$gradient = 0;

		// Diff left to right
		for ($i = 0; $i < $block - 1; $i++) {
			for ($j = 0; $j < $block; $j++) {
				$u = $data[($i * $block) + $j];
				$v = $data[(($i + 1) * $block) + $j];
				$d = \intval((($u - $v) * 100) / 255);
				$gradient += \abs($d);
			}
		}

		// Diff top to bottom
		for ($i = 0; $i < $block; $i++) {
			for ($j = 0; $j < $block - 1; $j++) {
				$u = $data[($i * $block) + $j];
				$v = $data[($i * $block) + $j + 1];
				$d = \intval((($u - $v) * 100) / 255);
				$gradient += \abs($d);
			}
		}

		// Heuristic scaling factor
		return \min(\intval($gradient / 90), 100);
	}
	
	/**
	 * Compute DCT (Discrete Cosine Transform)
	 */
	protected function dct(array $data) : array {
		$dct16x64 = \array_fill(0, 1024, 0);
		$buffer16x16 = \array_fill(0, 256, 0);
		$buffer16x64 = \array_fill(0, 1024, 0);
		$scale = \sqrt(2 / 64);
		
		// Precompute DCT matrix
		for ($i = 0; $i < 16; $i++) {
			for ($j = 0; $j < 64; $j++) {
				$dct16x64[$i * 64 + $j] = $scale * \cos((M_PI / 2 / 64) * ($i + 1) * (2 * $j + 1));
			}
		}

		// Build buffer16x64 from data
		for ($i = 0; $i < 16; $i++) {
			for ($j = 0; $j < 64; $j++) {
				$sumk = 0.0;
				for ($k = 0; $k < 64; $k++) {
					$sumk += $dct16x64[$i * 64 + $k] * $data[$k * 64 + $j];
				}
				$buffer16x64[$i * 64 + $j] = $sumk;
			}
		}

		// Calculate buffer16x16 from buffer16x64
		for ($i = 0; $i < 16; $i++) {
			for ($j = 0; $j < 16; $j++) {
				$sumk = 0.0;
				for ($k = 0; $k < 64; $k++) {
					$sumk += $buffer16x64[$i * 64 + $k] * $dct16x64[$j * 64 + $k];
				}
				$buffer16x16[$i * 16 + $j] = $sumk;
			}
		}
		$this->steps['dct'] = $buffer16x16;
		return $buffer16x16;
	}
	
	/**
	 * Generate hash(es) from DCT data
	 */
	protected function generateHashes(array $data, bool $transform = false) : string|array {
		$dcts = ['original' => $data];
		
		// Generate transformation matrices if requested
		if ($transform) {
			$dcts['rot90'] = $this->rotateMatrix($data);
			$dcts['flip'] = $this->flipMatrix($data);
			$dcts['rot180'] = $this->rotateMatrix($dcts['rot90']);
			$dcts['rot270'] = $this->rotateMatrix($dcts['rot180']);
			$dcts['fliprot90'] = $this->rotateMatrix($dcts['flip']);
			$dcts['fliprot180'] = $this->rotateMatrix($dcts['fliprot90']);
			$dcts['fliprot270'] = $this->rotateMatrix($dcts['fliprot180']);
		}
		
		// Compute hashes for each transformation
		$hashes = [];
		foreach ($dcts AS $item) {
			$binHash = $this->computeDct($item);
			$hexHash = $this->toHex($binHash);
			$hashes[] = $hexHash;
		}
		return $transform ? $hashes : $hashes[0];
	}
	
	/**
	 * Rotate a matrix 90 degrees clockwise
	 */
	protected function rotateMatrix(array $data) : array {
		$len = \count($data);
		$dim = \intval(\sqrt($len));
		$rotated = \array_fill(0, $len, 0);
		for ($i = 0; $i < $dim; $i++) {
			for ($j = 0; $j < $dim; $j++) {
				$rotated[$i * $dim + $j] = $data[($dim - $j - 1) * $dim + $i];
			}
		}
		return $rotated;
	}
	
	/**
	 * Flip a matrix horizontally
	 */
	protected function flipMatrix(array $data) : array {
		$len = \count($data);
		$dim = \intval(\sqrt($len));
		$flipped = [];
		for ($i = 0; $i < $dim; $i++) {
			for ($j = 0; $j < $dim; $j++) {
				$flipped[$i * $dim + $j] = $data[$i * $dim + ($dim - $j - 1)];
			}
		}
		return $flipped;
	}
	
	/**
	 * Compute hash from DCT data
	 */
	protected function computeDct(array $dct) : array {

		// Get the median value
		$sortedDct = $dct;
		\sort($sortedDct);
		$median = $sortedDct[127];
		
		// Create hash
		$hash = \array_fill(0, 32, 0); // 32 bytes = 256 bits
		foreach ($dct AS $i => $value) {
			if ($value > $median) {
				$hash[(int)\floor($i / 8)] |= 1 << ($i % 8);
			}
		}
		return $hash;
	}
	
	/**
	 * Convert binary hash to hex string
	 */
	protected function toHex(array $bytes) : string {
		$hex = '';
		foreach (\array_reverse($bytes) as $byte) {
			$hex .= \sprintf('%02x', $byte & 0xFF);
		}
		return $hex;
	}
	
	/**
	 * Render a hash visualization
	 */
	public function renderHash(string $hash) : \GdImage {

		// Convert hex string to binary array
		$binary = [];
		$len = \strlen($hash);
		
		// Process in pairs of hex characters (bytes)
		for ($i = 0; $i < $len; $i += 2) {
			if ($i + 1 < $len) {
				$byte = \hexdec(\substr($hash, $i, 2));
				for ($bit = 7; $bit >= 0; $bit--) {
					$binary[] = ($byte >> $bit) & 1 ? 0 : 255;
				}
			}
		}
		
		// Calculate dimensions - should be 16x16 for a 256-bit hash
		$dim = \intval(\sqrt(\count($binary)));
		
		// Create and fill the image
		$image = \imagecreatetruecolor($dim, $dim);
		$white = \imagecolorallocate($image, 255, 255, 255);
		$black = \imagecolorallocate($image, 0, 0, 0);
		
		// Reverse the order of bits to match the original orientation
		$reverse = \array_reverse($binary);
		$idx = 0;
		for ($y = 0; $y < $dim; $y++) {
			for ($x = 0; $x < $dim; $x++) {
				if ($idx < \count($reverse)) {
					$color = ($reverse[$idx] == 255) ? $white : $black;
					\imagesetpixel($image, $x, $y, $color);
					$idx++;
				}
			}
		}
		return $image;
	}

	public function hammingDistance(string $hex1, string $hex2) : int {
		$a1 = $this->hex2binCustom($hex1);
		$a2 = $this->hex2binCustom($hex2);
		$dh = 0;
		for ($i = 0; $i < \strlen($a1); $i++) {
			if ($a1[$i] !== $a2[$i]) {
				$dh++;
			}
		}
		return $dh;
	}
	
	protected function hex2binCustom(string $hex) : string {
		$bin = [];
		foreach (\str_split($hex) AS $item) {
			$bin[] = \str_pad(\base_convert($item, 16, 2), 4, '0', STR_PAD_LEFT);
		}
		return \implode('', $bin);
	}
}