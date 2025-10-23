<?php
declare(strict_types=1);
namespace swgfl\pdq;
use \GdImage;

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

	public function __construct(array $config = []) {
		$this->config = \array_merge($this->config, $config);
	}

	/**
	 * Main function to process images and generate PDQ hashes
	 * 
	 * @param array $files Files from $_FILES
	 * @param bool $compare Whether to compare against reference
	 * @param bool $debug Enable debug output
	 * @return array Results with images and hash data
	 */
	public function run(array|string|\GdImage $files, ?string &$error = null) : array|false {
		
		// normalise array
		if (!\is_array($files)) {
			$files = [$files];
		}

		// parameters
		$scale = $this->config['scale'];

		$output = [];
		foreach ($files AS $item) {
			\set_time_limit(60);
			$time = \microtime(true);
			
			// Load the image
			$image = null;
			if (!($item instanceof \GdImage) && ($image = $this->loadImageFromFile($item)) === false) {
				$error = 'The file requested is not a valid image';
				return false;

			// resize the image to a square
			} elseif (($image = $this->resize($image ?? $item, $scale)) === false) {
				$error = 'Unable to resize image';
				return false;

			// make the image greyscale
			} elseif (($image = $this->luminance($image)) === false) {
				$error = 'Unable to extract pixel data';
				return false;

			// 2 pass box blur filter
			} elseif (($image = $this->jaroszFilter($image, $this->config['passes'])) === false) {
				$error = 'Unable to apply blur filter';
				return false;

			// scale down to 64x64
			} elseif (($data = $this->rescale($image, $this->config['block'])) === false) {
				$error = 'Unable to rescale image';
				return false;

			// calculate quality metric
			} elseif (($quality = $this->quality($data, $this->config['block'])) === false) {
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
					'time' => \microtime(true) - $time
				];
			}
		}
		return isset($output[1]) ? $output : $output[0];
	}
	
	/**
	 * Load an image from a file
	 * 
	 * @param string $file the file path of the image
	 * @return \GdImage|false the image as a GdImage object, or false if there's an error
	 */
	protected function loadImageFromFile(string $file) : \GdImage|false {
		$type = \mime_content_type($file);
		if ($type === 'image/jpg' || $type === 'image/jpeg') {
			return \imagecreatefromjpeg($file);
		} else if ($type === 'image/png') {
			return \imagecreatefrompng($file);
		} else if ($type === 'image/gif') {
			return \imagecreatefromgif($file);
		} else if ($type === 'image/webp') {
			return \imagecreatefromwebp($file);
		} else if ($type === 'image/avif') {
			return \imagecreatefromavif($file);
		} else if ($type === 'image/wbmp') {
			return \imagecreatefromwbmp($file);
		} else if ($type === 'image/bmp') {
			return \imagecreatefrombmp($file);
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
	protected function resize(\GdImage $image, int $size) : \GdImage|false {
		$min = \min(\imagesx($image), \imagesy($image), $size);
		if (($square = \imagescale($image, $min, $min, IMG_BILINEAR_FIXED)) !== false) {
			if ($this->config['debug']) {
				$this->render($square);
			}
			return $square;
		}
		return false;
	}

	/**
	 * Echoes an image onto the page
	 * 
	 * @param \GdImage $image the image to render as a GdImage object
	 * @return void
	 */
	protected function render(\GdImage $image) : void {
		\ob_start();
		\imagepng($image);
		$png = \ob_get_clean();
		echo '<img src="data:image/png;base64,'.\base64_encode($png).'" width="" height="" />';
	}
	
	/**
	 * Converts a GdImage object to greyscale
	 * 
	 * @param \GdImage $image the image to convert
	 * @return \GdImage|false The updated GdImage, or false if there's an error
	 */
	protected function luminance(\GdImage $image) : \GdImage|false {
		\imagefilter($image, IMG_FILTER_GRAYSCALE);

		// debug
		if ($this->config['debug']) {
			$this->render($image);
		}
		return $image;
	}
	
	/**
	 * Apply a Jarosz (Box Blur or Tent) filter to the supplied GdImage
	 * 
	 * @param \GdImage $image the image to convert
	 * @return \GdImage|false the luma matrix as an array, or false if there's an error
	 */
	protected function jaroszFilter(\GdImage $image, int $passes = 2) : \GdImage|false {
		$value = 1;
		$matrix = [
			[$value, $value, $value],
			[$value, $value, $value],
			[$value, $value, $value]
		];
		$divisor = 9;
		$offset = 0;
		for ($i = 0; $i < $passes; $i++) {
			\imageconvolution($image, $matrix, $divisor, $offset);
		}
		
		// render the output
		if ($this->config['debug']) {
			$this->render($image);
		}
		return $image;
	}
	
	/**
	 * Rescale image data to specific block size, picking the centre pixel as the greyscale value
	 * 
	 * @param \GdImage $image A GdImage object
	 * @param int $block the block size
	 * @return array|false An array of single value pixels
	 */
	protected function rescale(\GdImage $image, int $block) : array|false {

		// Create a 1D array for the rescaled data
		$scaled = \array_fill(0, $block * $block, 0);
		$width = \imagesx($image);
		$height = \imagesy($image);
		$xscale = $width / $block;
		$yscale = $height / $block;
		
		// Target centers not corners as in the original implementation
		for ($j = 0; $j < $block; $j++) {
			for ($i = 0; $i < $block; $i++) {
				$x = \intval(\round(($i + 0.5) * $xscale));
				$y = \intval(\round(($j + 0.5) * $yscale));
				$rgb = \imagecolorat($image, $x, $y);
				$scaled[$j * $block + $i] = $rgb & 0xFF;
			}
		}
		
		// render the output
		if ($this->config['debug']) {
			$this->renderData($scaled, $block, $block);
		}
		return $scaled;
	}
	
	/**
	 * Convert image data back to a GD image (for flat 1D array)
	 * 
	 * @param array $data the array of image data
	 * @param int $width the width of the image to return
	 * @param int $height the height of the image to return
	 * @return void
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
	 * Generate a quality metric
	 * 
	 * @param array $data the array of image data
	 * @param int $width the width of the image to return
	 * @param int $height the height of the image to return
	 * @return void
	 */
	protected function quality(array $data, int $block) : int {
		$gradient = 0;

		// Diff left to right
		for ($y = 0; $y < $block; $y++) {
			for ($x = 0; $x < $block - 1; $x++) {
				$d = \intval((($data[$x * $block + $y] - $data[($x + 1) * $block + $y]) * 100) / 255);
				$gradient += \abs($d);
			}
		}

		// Diff top to bottom
		for ($x = 0; $x < $block ; $x++) {
			for ($y = 0; $y < $block- 1; $y++) {
				$d = \intval((($data[$x * $block + $y] - $data[$x * $block + $y + 1]) * 100) / 255);
				$gradient += \abs($d);
			}
		}

		// Heuristic scaling factor
		return \min(\intval($gradient / 90), 100);
	}
	
	/**
	 * Compute DCT (Discrete Cosine Transform)
	 * 
	 * @param array $data the image data as an array
	 * @return array|false the dct data, or false if there's an error
	 */
	protected function dct(array $data) : array|false {
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
		return $buffer16x16;
	}
	
	/**
	 * Generate hash(es) from DCT data
	 * 
	 * @param array $data the DCT data
	 * @param bool $transform whether to return hashes for transformed image (rotated, flipped, etc)
	 * @return string|array|false the hash as a string (if transform is false) or the hashes as an array (if transform is true), or false if there's an error
	 */
	protected function generateHashes(array $data, bool $transform = false) : string|array|false {
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

			if ($this->config['debug']) {
				$this->render($this->renderHash($hexHash));
			}
		}
		return $transform ? $hashes : $hashes[0];
	}
	
	/**
	 * Rotate a matrix 90 degrees clockwise
	 * 
	 * @param array $data the image data to rotate
	 * @return array the rotated image data as an array
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
	 * 
	 * @param array $data the image data to rotate
	 * @return array the rotated image data as an array
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
	 * 
	 * @param array $data the image data to rotate
	 * @return array the rotated image data as an array
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
				$hash[\intval(\floor($i / 8))] |= 1 << ($i % 8);
			}
		}
		return $hash;
	}
	
	/**
	 * Convert binary hash to hex string
	 * 
	 * @param array $bytes the binary data
	 * @return string the hex string returned from converting the binary data
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
	 * 
	 * @param string $hash the hash string to render
	 * @return \GdImage the rendered hash as a GdImage
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

	/**
	 * Calculates the difference between two hex strings
	 * 
	 * @param string $hex1 the first hex string to compare
	 * @param string $hex2 the second hex string to compare
	 * @return int the distance (difference)
	*/
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

	public function getBitDiff(string $hex1, string $hex2) : string {
		$bits = '';
		foreach (\str_split($hex1) AS $key => $item) {
			$bits .= $hex2[$key] === $item ? '1' : '0';
		}
		return $bits;
	}

	/**
	 * Converts a hex string to binary
	 * 
	 * @param string $hex the hex string to convert
	 * @return string the converted binary string
	 */
	protected function hex2binCustom(string $hex) : string {
		$bin = [];
		foreach (\str_split($hex) AS $item) {
			$bin[] = \str_pad(\base_convert($item, 16, 2), 4, '0', STR_PAD_LEFT);
		}
		return \implode('', $bin);
	}
}