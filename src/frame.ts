
type FrameData = {
	data: Uint8Array | Uint8ClampedArray;
	width: number;
	height: number;
};

/**
 * Extract frames from a video using the WebCodecs API
 * 
 * @param video The video element that contains the video to extract frames from
 * @returns Promise
 */
function extractFrameWebCodecs(video: HTMLVideoElement) : Promise<FrameData> {
	const frame = new VideoFrame(video, { timestamp: 0 }),
		width = frame.displayWidth,
		height = frame.displayHeight,
		size = frame.allocationSize({ format: "RGBA" }),
		buffer = new Uint8Array(size);
	return frame.copyTo(buffer, { format: "RGBA" }).then(() => {
		frame.close();
		return { data: new Uint8ClampedArray(buffer.buffer), width, height };
	});
}

let canvas: OffscreenCanvas|undefined,
	ctx: OffscreenCanvasRenderingContext2D|undefined|null;

function extractFrameCanvas(video: HTMLVideoElement) : Promise<FrameData> {

	// generate a reusable canvas object
	if (ctx === undefined) {
		canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
		ctx = canvas.getContext("2d");
	}
	return new Promise((resolve, reject) => {
		if (canvas && ctx) {
			canvas.width = video.width;
			canvas.height = video.height;
			ctx.drawImage(video, 0, 0);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			resolve({ data: imageData.data, width: canvas.width, height: canvas.height });
		} else {
			reject();
		}
	});
}

export default (video: HTMLVideoElement, pos: number) : Promise<FrameData> => {

	// seek to frame position
	video.currentTime = pos;

	// extract video frame
	if (typeof VideoFrame !== "undefined") {
		return extractFrameWebCodecs(video);
	} else {
		return extractFrameCanvas(video);
	}
}