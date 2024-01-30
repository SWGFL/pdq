module.exports = function(grunt) {
	require("load-grunt-tasks")(grunt);
	const {nodeResolve} = require('@rollup/plugin-node-resolve');

	// grun tasks
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		config: {
			js: "dist/pdq.js",
			jsmin: "dist/pdq.min.js"
		},
		rollup: {
			options: {
				sourcemap: true,
				plugins: [nodeResolve()],
				format: "es"
			},
			es6: {
				src: "src/pdq.js",
				dest: "<%= config.js %>"
			}
		},
		babel: {
			es6: {
				files: {
					"<%= config.js %>": "<%= config.js %>"
				},
				options: {
					sourceMap: true,
					comments: false
				}
			}
		},
		terser: {
			options: {
				toplevel: true,
				mangle: {
					reserved: ["$"],
				}
			},
			es6: {
				ecma: 2015,
				mangle: {
					module: true
				},
				files: {
					"<%= config.jsmin %>": "<%= config.js %>"
				}
			}
		},
		watch: {
			options: {
				interrupt: true,
				spawn: false,
				atBegin: true
			},
			js: {
				files: ["src/**/*.js"],
				tasks: ["rollup"]
			},
			gruntfile: {
				files: ["gruntfile.js", "package.json"],
				tasks: ["sass:dev", "postcss:dev", "rollup:es6"],
				options: {atBegin: false}
			}
		}
	});

	grunt.registerTask("default", ["rollup", "babel", "terser"]);
};
