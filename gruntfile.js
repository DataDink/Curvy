module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			options: { separator: ';\r\n\r\n' },
			curvy: {
				src: [
					'src/core.js',
					'src/services/utilities.js',
					'src/services/broadcast.js',
					'src/services/bindings.js',
					'src/services/http.js',
					'src/services/html.js',
					'src/services/route.js',
					
					'src/bindings/data-routed.js',
					'src/bindings/data-template.js',
					'src/bindings/data-view.js',
					'src/bindings/view-model.js',
					'src/bindings/data-format.js',
					'src/bindings/data-bind.js',
					'src/bindings/data-html.js',
					'src/bindings/data-src.js',
					'src/bindings/data-href.js',
					'src/bindings/data-title.js',
					'src/bindings/data-show.js',
					'src/bindings/data-hide.js',
					'src/bindings/data-class.js',
					'src/bindings/data-submit.js',
					'src/bindings/data-click.js'
				],
				dest: 'builds/curvy.js'
			}
		},
		uglify: {
			index: { src: 'builds/curvy.js', dest: 'builds/curvy.min.js' }
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('build-all', ['concat', 'uglify']);
};
	