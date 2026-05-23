// Provide minimal browser globals required by tmk.ts at module-load time in Node.js.
// In Node.js 21+, navigator.hardwareConcurrency is natively available; this is a
// safety net for earlier runtimes.
if (typeof navigator === "undefined") {
	Object.defineProperty(globalThis, "navigator", {
		value: {hardwareConcurrency: 4},
		writable: true,
		configurable: true,
	});
}
