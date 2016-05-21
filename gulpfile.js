const gulp = require('gulp')
const nodemon = require('gulp-nodemon')
const plumber = require('gulp-plumber')
const livereload = require('gulp-livereload')
const sass = require('gulp-sass')

gulp.task('sass', function () {
  gulp.src('./public/css/*.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(gulp.dest('./public/css'))
    .pipe(livereload())
})

gulp.task('watch', function () {
  gulp.watch('./public/css/*.scss', ['sass'])
})

gulp.task('develop', function () {
  livereload.listen()
  nodemon({
    script: 'bin/www',
    ext: 'js pug coffee',
    stdout: false
  }).on('readable', function () {
    this.stdout.on('data', function (chunk) {
      if (/^Express server listening on port/.test(chunk)) {
        livereload.changed(__dirname)
      }
    })
    this.stdout.pipe(process.stdout)
    this.stderr.pipe(process.stderr)
  })
})

gulp.task('default', [
  'sass',
  'develop',
  'watch'
])
