export default {
	rotate: data => {
		const len = data.length,
			dim = Math.sqrt(len),
			rotated = Array(len);
		for (let i = 0; i < dim; i++) {
			for (let j = 0; j < dim; j++) {
				rotated[i * dim + j] = data[(dim - j - 1) * dim + i];
			}
		}
		return rotated;
	},
	flip: data => {
		const len = data.length,
			dim = Math.sqrt(len);
		let flipped = [];
		for (let i = 0; i < dim; i++) {
			flipped = flipped.concat(data.slice(i * dim, (i + 1) * dim).reverse());
		}
		return flipped;
	}
};