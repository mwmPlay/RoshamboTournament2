module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	
	// Project configuration.
	grunt.initConfig({
		sass: {
			options: {
				sourceMap: true
			},
			dist: {
				files: [
					{
						//{'client/index.css': 'src/index.scss'}
						// Set to true for recursive search
						expand: true,
						cwd: 'src/',
						src: ['**/*.scss'],
						dest: 'client/',
						ext: '.css'
					}
				]
			}
		}
	});

	// Default task(s).
	grunt.registerTask('default', ['sass']);
};