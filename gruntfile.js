module.exports = function(grunt) {
   grunt.initConfig({
      concat: {
         options: { separator: ';\r\n\r\n' },
         curvy: {
            src: [
               'src/Curvy.js',
               'src/Curvy.Configuration.js',
               'src/Curvy.Observable.js',
               'src/services/Curvy.Services.js',
               'src/services/Curvy.Modules.js',
               'src/services/Curvy.Services.Injector.js',
               'src/services/Curvy.Services.Utilities.js',
               'src/services/Curvy.Services.DomWatcher.js'
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
