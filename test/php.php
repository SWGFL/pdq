<?php
declare(strict_types=1);
require \dirname(__DIR__) . '/src/pdq.php';
require __DIR__.'/scripts/pdq.php';

if (!empty($_FILES['file'])) {
	$reference = !empty($_POST['reference']);
	$file = $_FILES['file']['tmp_name'];
	$mime = \mime_content_type($file);
	if (\str_starts_with($mime, 'image/')) {
		$time = \microtime(true);
		$data = [
			'type' => 'pdq',
			'hash' => null,
			'quality' => null
		];

		// reference
		if (!empty($_POST['reference'])) {
			list($hash, $data['quality']) = \PDQHasher::computeHashAndQualityFromFilename($file, false, false, true);
			$data['hash'] = $hash->toHexString();

		// our version
		} else {
			$pdq = new \swgfl\pdq\pdq();
			if (($result = $pdq->run($file)) !== false) {
				$data = \array_merge($data, $result);
			}
		}

		// add timing
		$data['time'] = \microtime(true) - $time;

		// return JSON
		\header('Content-Type: application/json');
		exit(\json_encode($data));
	}
}
\http_response_code(400);
exit;

if ($_SERVER["REQUEST_METHOD"] === "POST") {

	$compare = $_POST['pdq-compare'] ?? false;
	$debug = $_POST['pdq-debug'] ?? false;

	// check for files
	if (!empty($_FILES['pdq-files'])) { 

		$pdq = new \swgfl\pdq\pdq(['debug' => $debug]);

		$results = [];
		foreach($_FILES['pdq-files']['tmp_name'] as $file) {

			$start = \microtime(true);
			$result = $pdq->run($file);
			$time = \round((\microtime(true) - $start) * 1000);

			if ($compare) {
				$refstart = \microtime(true);
				list($hash, $quality) = \PDQHasher::computeHashAndQualityFromFilename($file, false, false, true);
				$reftime = \round((\microtime(true) - $refstart) * 1000);
				$hex = $hash->toHexString();
				$distance = $pdq->hammingDistance($hex, $result[0]['hash']);
				$results[] = \array_merge($result[0], ['time' => $time, 'reference' => $hex, 'diff' => $distance, 'reftime' => $reftime]);
			} else {
				$results[] = \array_merge($result[0], ['time' => $time]);
			}
		}

		var_dump($results);


		// $pdq = new \swgfl\pdq\pdq(['debug' => $debug]);
		// $result = $pdq->run($_FILES['pdq-files']['tmp_name']);
		// var_dump($result);
    
		// if (!empty($result)) {

		// 	$totaltime = $totalreftime = $totaldiff = 0;

		// 	echo '<section class="pdq__results" id="pdq-results">
		// 		<table>
		// 			<thead>
		// 				<th>File</th>
		// 				<th>Type</th>
		// 				<th>Size</th>
		// 				<th>Hashes</th>
		// 				<th>Quality</th>';
		// 				echo $compare ? '<th>Diff</th>' : '';
		// 				echo '<th>Speed</th>
		// 			</thead>
		// 			<tbody>';

		// 	foreach($result as $index => $processed) {

		// 		if ($compare) {
		// 			$refstart = \microtime(true);
		// 			list($hash, $quality) = \PDQHasher::computeHashAndQualityFromFilename($processed['file'], false, false, true);
		// 			$reftime = \round((\microtime(true) - $refstart) * 1000);
		// 			$hex = $hash->toHexString();
		// 			$distance = $pdq->hammingDistance($hex, $processed['pdqhash']['hash'][0]);
		// 		}

		// 		echo '<tr>
		// 				<td style="word-break: break-all;">' . $processed['name'] . '</td>
		// 				<td>' . $processed['mime'] . '</td>
		// 				<td>' . $processed['size'] . '</td>
		// 				<td>';
		// 				echo $compare ? 'Reference: ' . $hex . '<br>PHP: ' . $processed['pdqhash']['hash'][0] : $processed['pdqhash']['hash'][0];
		// 			echo '</td>
		// 				<td>' . $processed['quality'] . '</td>';
		// 			echo $compare ? '<td>' . $distance . '/256 (' . \round(($distance / 256) * 100, 3) . '%)</td>' : '';
		// 			echo $compare ? '<td>' . $reftime . 'ms (Reference)<br>' . $processed['time'] . 'ms (PHP)<br>' . \round(($reftime / $processed['time']), 3) . 'x</td>' : '<td>' . $processed['time'] . 'ms</td>';
		// 			echo '</tr>';
				
		// 		if($compare) {
		// 			$totalreftime += $reftime;
		// 			$totaldiff += $distance;
		// 		}
		// 		$totaltime += $processed['time'];
		// 	}

		// 	echo '<tr>
		// 			<td></td>
		// 			<td></td>
		// 			<td></td>
		// 			<td></td>
		// 			<td></td>';
		// 		echo $compare ? '<td>' . $totaldiff . '/' . (256 * \count($result)) . ' (' . \round(($totaldiff / (256 * \count($result))) * 100, 3) . '%)</td>' : '';
		// 		echo $compare ? '<td>' . $totalreftime . 'ms (Reference)<br>' . $totaltime . 'ms (PHP)<br>' . \round(($totalreftime / $totaltime), 3) . 'x</td>' : '<td>' . $totaltime . 'ms</td>';
		// 		echo '</tr>
		// 		</tbody>
		// 	</table>
		// 	</section>';

		// 	if ($debug) {
		// 		foreach($result as $index => $processed) {
		// 			echo '<div class="pdq__image-container">';
		// 			echo '<h3>' . $processed['name'] . '</h3>';
		// 			echo '<p><strong>Type:</strong> ' . $processed['mime'] . ' <span class="sep">|</span> <strong>Size:</strong> ' . $processed['size']  . ' <span class="sep">|</span> <strong>Hash:</strong> ' . $processed['pdqhash']['hash'][0]  . ' <span class="sep">|</span> <strong>Quality:</strong> ' . $processed['quality']  . ' <span class="sep">|</span> <strong>Speed:</strong> ' . $processed['time'] . 'ms</p>';

		// 			// Output the images
		// 			foreach($processed as $key => $item) {
		// 				if(is_object($processed[$key]) && $processed[$key] instanceof GdImage) {
		// 					// Start output buffering
		// 					ob_start();

		// 					// Output the image to the buffer
		// 					imagepng($processed[$key]);
							
		// 					// Get the buffer contents and encode as base64
		// 					$imageData = ob_get_clean();
		// 					$base64Image = base64_encode($imageData);
							
		// 					// Create the data URI
		// 					$dataUri = 'data:' . $processed['mime'] . ';base64,' . $base64Image;
							
		// 					// Output image tag with data URI
		// 					echo '<img src="' . $dataUri . '" alt="' . $processed['name'] . ' (' . $key . ')">';

		// 					// Free up memory
		// 					imagedestroy($processed[$key]);
		// 				}

		// 				// Render the hash
		// 				if ($key === 'pdqhash') {
		// 					// Start output buffering
		// 					ob_start();

		// 					// Output the image to the buffer
		// 					imagepng($pdq->renderHash($processed['pdqhash']['hash'][0]));
							
		// 					// Get the buffer contents and encode as base64
		// 					$imageData = ob_get_clean();
		// 					$base64Image = base64_encode($imageData);
							
		// 					// Create the data URI
		// 					$dataUri = 'data:' . $processed['mime'] . ';base64,' . $base64Image;
							
		// 					// Output image tag with data URI
		// 					echo '<img src="' . $dataUri . '" alt="' . $processed['name'] . ' (' . $key . ')">';
		// 				}
		// 			}
		// 		}
		// 	}
		// } else {
		// 	echo 'No result from PDQ class';
		// }
	}
}
?>
<!DOCTYPE html>
<html>
	<head>
		<title>PHP PDQ Test Page</title>
		<style>
			body {
				font-family: Segoe UI, sans-serif;
			}
			.pdq__control {
				padding: 3px 0;
				display: flex;
				align-items: center;
			}
			.pdq__label {
				flex: 0 0 25%;
				box-sizing: border-box;
				padding-right: 10px;
				text-align: right;
			}
			.pdq__input {
				border: 1px solid #000;
				padding: 10px;
			}
			.pdq__submit {
				background: #000;
				padding: 10px;
				color: #FFF;
				font-weight: bold;
				margin-left: 25%;
				border: 0;
				width: 40%;
			}
			.pdq__required {
				color: #c00;
			}
			.pdq__image-container {
				margin-block-end: 8px;
			}
			.pdq__image-container h3 {
				margin-block-start: 30px;
				margin-block-end: 10px;
			}
			.pdq__image-container p {
				margin-block-start: 0;
			}
			table, thead, tbody, tr, td, th {
				padding: 0;
				border: 0;
				margin: 0;
				border-collapse: separate;
				border-spacing: 0;
				text-align: left;
			}
			table {
				margin: 15px 0;
				padding: 0;
				width: 100%;
			}
			th, td {
				padding: 5px;
				border-bottom: 1px solid #AAA;
			}
			input, textarea, select, button {
				font-family: inherit;
				font-size: inherit;
				line-height: inherit;
			}
			.sep {
				opacity: 0.3;
				margin-inline: 5px;
			}
		</style>
	</head>
	<body>
		<section class="pdq__select">
			<h1>PHP PDQ Test Page</h1>
			<p>Select the image(s) you want to test, they will be run against the WASM version and the native code and compared. Output will not be exact due to differences in how the images are processed.</p>
			<form method="POST" enctype="multipart/form-data">
				<div class="pdq__control">
					<label class="pdq__label">Select Image(s)<span class="pdq__required">*</span>:</label>
					<input class="pdq__input" type="file" id="pdq-files" value="" name="pdq-files[]" multiple="multiple" required accept="image/png, image/jpeg, image/jpg, image/gif" />
				</div>
				<div class="pdq__control">
					<label class="pdq__label">Compare to Reference:</label>
					<input class="pdq__input" type="checkbox" id="pdq-compare" name="pdq-compare" value="true" />
				</div>
				<div class="pdq__control">
					<label class="pdq__label">Debug:</label>
					<input class="pdq__input" type="checkbox" id="pdq-debug" name="pdq-debug" value="true" />
				</div>
				<div class="pdq__control">
					<input class="pdq__submit" type="submit" id="pdq-start" value="Generate Hashes" />
				</div>
			</form>
		</section>
	</body>
</html>

