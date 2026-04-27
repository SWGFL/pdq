/**
 * Extracts a single frame from an HTMLVideoElement at the given time (in seconds)
 * by drawing it onto an OffscreenCanvas and returning the raw RGBA pixel data.
 */
export default function frame(video: HTMLVideoElement, time: number): Promise<Uint8ClampedArray> {
	return new Promise((resolve, reject) => {
		const seeked = () => {
			video.removeEventListener("seeked", seeked);
			const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get 2d context from OffscreenCanvas"));
				return;
			}
			ctx.drawImage(video, 0, 0);
			resolve(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
		};
		video.addEventListener("seeked", seeked);
		video.currentTime = time;
	});
}
