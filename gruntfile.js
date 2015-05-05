module.exports = function(grunt) {
	grunt.initConfig({
		less: {
			index: {
				compress: true,
				files: {
					'styles/site.css' : 'styles/site.less'
				}
			}
		},
		concat: {
			options: { separator: ';\r\n\r\n' },
			curvy: {
				src: [
					'builds/curvy.js',
					'scripts/services/*.js',
					'scripts/viewmodels/*.js'
				],
				dest: 'scripts/index.js'
			}
		},
		uglify: {
			index: { src: 'scripts/index.js', dest: 'scripts/index.min.js' }
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('build-all', ['less', 'concat', 'uglify']);
	grunt.registerTask('build-styles', ['less']);
	grunt.registerTask('build-scripts', ['concat', 'uglify']);
};
	