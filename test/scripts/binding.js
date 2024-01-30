import "./pdq-wasm.js";
import "./hash-wasm.js";
import * as Magick from './magickApi.js';

// Fetch the image to rotate, and call image magick
async function getPDQHash(filename, tempfilename, filesize) {

	// Read the file whose hash needs to be calculated.     
	let sourceBytes = FS.readFile(filename);

	// Call image magick with one source image, and command to convert the file to .pnm file required for hash calculation.
	const files = [{ 'name': filename, 'content': sourceBytes }];
	const command = ["convert", filename, "-density", "400x400", tempfilename];

	let processedFiles = await Magick.Call(files, command);

	// response can be multiple files (example split)
	// here we know we just have one
	let firstOutputImage = processedFiles[0];

	const data = new Uint8Array(await firstOutputImage['blob'].arrayBuffer());

	let stream = FS.open(tempfilename, 'w+');
	FS.write(stream, data, 0, data.length, 0);
	FS.close(stream);

	var result = Module.ccall(
		'getHash',	// name of C function
		'string',	// return type
		['string'],	// argument types
		[filename]	// arguments
	);

	// Remove the file so that we can free some memory.
	FS.unlink(filename);
	return result;
};
		
/**
  Method for getting the file size.
**/
function formatFileSize(bytes, decimalPoint) {
	if (bytes == 0) return '0 Bytes';
	var k = 1024,
		dm = decimalPoint || 2,
		sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


export default file => {
	return new Promise(success => {
		let reader = new FileReader();
		reader.onloadend = e => {

			let result = reader.result;
			const data = new Uint8Array(result);

			// Save the selected files to emscripten file system for c++ code to access the file.
			let stream = FS.open(file.name, 'w+');
			FS.write(stream, data, 0, data.length, 0);
			FS.close(stream);

			// Call the function for converting the image to .pnm file using image magick web assembly.
			getPDQHash(file.name, `${file.name.substring(0, file.name.lastIndexOf("."))}_temp.pnm`, formatFileSize(file.size, 2)).then(hash => {
				success(hash);
			});
		}
		reader.readAsArrayBuffer(file);
	});
};