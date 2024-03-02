const luma = {
	r: 0.299,
	g: 0.587,
	b: 0.114
};

export default imgdata => {
	const data = Array(imgdata.length / 4);
		  
	// Convert the pixel data to luminance
	for (let i = 0; i < imgdata.length / 4; i++) {
		data[i] = luma.r * imgdata[i * 4] + luma.g * imgdata[i * 4 + 1] + luma.b * imgdata[i * 4 + 2];
	}
	return data;
};