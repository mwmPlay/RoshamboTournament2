module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.initConfig({
	    pkg: grunt.file.readJSON('package.json'),
		sass: {
			dist: {
				files: {
				    'client/index.css': [
						'src/scss/main.scss'
				    ]
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