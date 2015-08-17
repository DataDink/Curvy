module.exports = function(grunt) {
   grunt.initConfig({
      concat: {
         options: { separator: ';\r\n\r\n' },
         curvy: {
            src: [
               // core
               'polyfills/*.js',
               'src/Curvy.js',

               // lib
               'src/Configuration.js',
               'src/Observable.js',

               // services
               'src/services/utilities.js',
               'src/services/Injector.js',
               'src/services/Broadcast.js',
               'src/services/DomWatcher.js',
               'src/services/Http.js',
               'src/services/Route.js',

               // modules
               'src/modules/*.js',

               // bindings
               'src/bindings/*.js',
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
