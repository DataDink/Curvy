module.exports = function(grunt) {
   grunt.initConfig({
      concat: {
         options: { separator: ';\r\n\r\n' },
         curvy: {
            src: [
               // core
               'polyfills/*.js',
               'src/Curvy.js',

               // namespaces
               'src/modules/Modules.js',
               'src/services/Services.js',
               'src/bindings/Bindings.js',

               // lib
               'src/Configuration.js',
               'src/Observable.js',

               // services
               'src/services/Injector.js',
               'src/services/Utilities.js',
               'src/services/DomWatcher.js',

               // modules
               'src/modules/Bindings.js',
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
