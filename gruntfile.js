module.exports = function(grunt) {
	grunt.initConfig({
		less: {
			index: {
				compress: true,
				files: {
					'styles/themes/default.css' : 'styles/themes/default.less'
				}
			}
		},
		concat: {
			options: { separator: ';\r\n\r\n' },
			curvy: {
				src: [
					'builds/curvy.js',
					'scripts/application.js',
					'scripts/viewmodels/*.js'
				],
				dest: 'scripts/views/index.js'
			}
		},
		uglify: {
			index: { src: 'scripts/views/index.js', dest: 'scripts/views/index.min.js' }
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask('build-all', ['less', 'concat', 'uglify']);
	grunt.registerTask('build-styles', ['less']);
	grunt.registerTask('build-scripts', ['concat', 'uglify']);
};
	