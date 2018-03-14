module.exports = function(grunt) {
	// do all the loadNpmTasks stuff
	require('load-grunt-tasks')(grunt);
	
	grunt.initConfig({
		sass: {
			options: {
				sourceMap: true
			},
			dist: {
				files: {
					'client/index.css': 'src/scss/main.scss'
				}
			}
		},
		watch : {
			css: {
				files: [
					'src/**/*.scss'
				],
				tasks: ['sass']
			}
		}
	})
	grunt.registerTask('default', 'watch');
};