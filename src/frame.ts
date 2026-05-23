
type ExtractedFrame = { bitmap: ImageBitmap; frameIndex: number };

const mp4box = "./mp4box.all.js"; // separate variable so it doesn't get inlined

export default function extractVideoFrames(
	source: ArrayBuffer,
	fps: number,
	onFrame: (frame: ExtractedFrame) => void,
	ontotal?: (total: number) => void
): Promise<void> {
	return new Promise((resolve, reject) => {
		import(new URL(mp4box, import.meta.url).href)
			.then(({createFile, DataStream}: {createFile: () => any; DataStream: any}) => {

				// setup tracking variables
				let timescale = 0,
					totalSamples = 0,
					samplesReceived = 0,
					frameIndex = 0,
					lastIdxAtFps = -1,
					pendingCopies = 0,
					decoderFlushed = false,
					decoder: VideoDecoder | null = null;
				const mp4file = createFile(),
					checkDone = () => {
						if (decoderFlushed && pendingCopies === 0) {
							resolve();
						}
					};

				mp4file.onReady = (info: any) => {
					const videoTrack = info.tracks.find((t: any) => t.video);
					if (videoTrack) {
						timescale = videoTrack.timescale;
						totalSamples = videoTrack.nb_samples;
						ontotal?.(Math.round((info.duration / info.timescale) * fps));

						let description: Uint8Array | undefined;
						const entry = mp4file.getTrackById(videoTrack.id)
							?.mdia?.minf?.stbl?.stsd?.entries?.[0];
						const codecBox = entry?.avcC ?? entry?.hvcC ?? entry?.vpcC ?? entry?.av1C;
						if (codecBox) {
							const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
							codecBox.write(stream);
							description = new Uint8Array(stream.buffer.slice(8));
						}

						decoder = new VideoDecoder({
							output: (frame: VideoFrame) => {
								const idxAtFps = Math.round((frame.timestamp / 1_000_000) * fps);
								if (idxAtFps > lastIdxAtFps) {
									lastIdxAtFps = idxAtFps;
									pendingCopies++;
									// Wrap the VideoFrame without resizing — O(1) in all browsers.
									// Resize happens inside the worker via drawImage, running in parallel across all workers.
									createImageBitmap(frame).then(bitmap => {
										frame.close();
										onFrame({bitmap, frameIndex: frameIndex++});
										pendingCopies--;
										checkDone();
									}).catch((err: unknown) => {
										frame.close();
										reject(err);
									});
								} else {
									frame.close();
								}
							},
							error: reject,
						});

						decoder.configure({
							codec: videoTrack.codec,
							codedWidth: videoTrack.video.width,
							codedHeight: videoTrack.video.height,
							...(description ? {description} : {}),
						});

						mp4file.setExtractionOptions(videoTrack.id, null, {nbSamples: totalSamples});
						mp4file.start();
					} else {
						reject(new Error("No video track found"));
					}
				};

				mp4file.onSamples = (_id: number, _user: unknown, samples: any[]) => {
					for (const sample of samples) {
						decoder!.decode(new EncodedVideoChunk({
							type: sample.is_sync ? "key" : "delta",
							timestamp: (sample.cts * 1_000_000) / timescale,
							duration: (sample.duration * 1_000_000) / timescale,
							data: sample.data,
						}));
						samplesReceived++;
					}
					if (samplesReceived >= totalSamples) {
						decoder!.flush().then(() => {
							decoderFlushed = true;
							checkDone();
						});
					}
				};

				const buf = source.slice(0) as ArrayBuffer & {fileStart: number};
				buf.fileStart = 0;
				mp4file.appendBuffer(buf);
				mp4file.flush();
			})
			.catch(reject);
	});
}
