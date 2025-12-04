<?php
declare(strict_types=1);
require \dirname(__DIR__) . '/src/pdq.php';
require __DIR__.'/scripts/pdq.php';

// default variable values
$compare = $debug = $results = false;

// this bit is for the Javascript/PHP comparison
if (!empty($_FILES['file'])) {
	$reference = !empty($_POST['reference']);
	$file = $_FILES['file']['tmp_name'];
	$mime = \mime_content_type($file);

	// only images
	if (\str_starts_with($mime, 'image/')) {
		$time = \microtime(true);
		$data = [
			'type' => 'pdq',
			'hash' => null,
			'quality' => null,
			'steps' => null
		];

		// reference
		if (!empty($_POST['reference'])) {
			list($hash, $data['quality'], $data['steps']) = \PDQHasher::computeHashAndQualityFromFilename($file, false, false, true);
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
	\http_response_code(400);
	exit('Not a valid image');

// this is for this script
} elseif (!empty($_FILES['pdq-files'])) { 

	// prepare variables
	$compare = $_POST['pdq-compare'] ?? false;
	$pdq = new \swgfl\pdq\pdq(['debug' => $_POST['pdq-debug'] ?? false]);

	// process images
	$results = [];
	foreach ($_FILES['pdq-files']['tmp_name'] AS $key => $file) {

		// generate PDQ
		$start = \microtime(true);
		$result = \array_merge([
			'file' => $_FILES['pdq-files']['name'][$key],
			'type' => $_FILES['pdq-files']['type'][$key],
			'size' => \getimagesize($file)
		], $pdq->run($file));
		$time = \round((\microtime(true) - $start) * 1000);

		// compare with reference
		if ($compare) {
			$refstart = \microtime(true);
			list($hash, $quality) = \PDQHasher::computeHashAndQualityFromFilename($file, false, false, true);
			$reftime = \round((\microtime(true) - $refstart) * 1000);
			$hex = $hash->toHexString();
			$distance = $pdq->hammingDistance($hex, $result['hash']);
			$results[] = \array_merge($result, ['time' => $time, 'reference' => $hex, 'diff' => $distance, 'reftime' => $reftime]);
		} else {
			$results[] = \array_merge($result, ['time' => $time]);
		}
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
			<p>Select the image(s) you want to test, they will be run against the reference PHP version of the code. Output will not be exact due to differences in how the images are processed.</p>
			<form method="POST" enctype="multipart/form-data">
				<div class="pdq__control">
					<label class="pdq__label">Select Image(s)<span class="pdq__required">*</span>:</label>
					<input class="pdq__input" type="file" id="pdq-files" value="" name="pdq-files[]" multiple="multiple" required accept="image/png, image/jpeg, image/jpg, image/gif" />
				</div>
				<div class="pdq__control">
					<label class="pdq__label">Compare to Reference:</label>
					<input class="pdq__input" type="checkbox" id="pdq-compare" name="pdq-compare" value="true"<?= $compare ? ' checked="checked"' : ''; ?> />
				</div>
				<div class="pdq__control">
					<label class="pdq__label">Debug:</label>
					<input class="pdq__input" type="checkbox" id="pdq-debug" name="pdq-debug" value="true"<?= $debug ? ' checked="checked"' : ''; ?> />
				</div>
				<div class="pdq__control">
					<input class="pdq__submit" type="submit" id="pdq-start" value="Generate Hashes" />
				</div>
			</form>
			<?php if (!empty($results)) { ?>
				<table>
					<thead>
						<tr>
							<th>File</th>
							<th>Type</th>
							<th>Size</th>
							<th>Hashes</th>
							<th>Quality</th>
							<?php if ($compare) { ?>
								<th>Diff</th>
							<?php } ?>
							<th>Speed</th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ($results AS $item) { ?>
							<tr>
								<td><?= \htmlspecialchars($item['file']); ?></td>
								<td><?= \htmlspecialchars($item['type']); ?></td>
								<td><?= \htmlspecialchars($item['size'][0].'x'.$item['size'][1]); ?></td>
								<td><code><?= 'PHP: '.$item['hash'].($compare ? '<br />Ref: '.$item['reference'] : ''); ?></code></td>
								<td><?= $item['quality']; ?></td>
								<?php if ($compare) { ?>
									<td><?= \htmlspecialchars($item['diff'].' / 256 ('.\number_format(100 / 256 * $item['diff'], 3).'%)'); ?></td>
								<?php } ?>
								<td><?= \number_format($item['time']).'ms'.($compare ? ' (PHP)<br />'.\number_format($item['reftime']).'ms (Reference)<br />'.\number_format($item['reftime'] / $item['time'], 3).'x' : ''); ?></td>
							</tr>
						<?php } ?>
					</tbody>
				</table>
			<?php } ?>
		</section>
	</body>
</html>