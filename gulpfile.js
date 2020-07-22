var gulp = require('gulp');
var clean = require('gulp-clean');
var rename = require('gulp-rename');
var replace = require('gulp-token-replace');
var argv = require('yargs').argv;
var conf = (argv.dev === undefined) ? 'public' : 'dev';

gulp.task('clean-temp', function () {
    return gulp.src('./tmp', {read: false})
      .pipe(clean());
  });

gulp.task('token-replace-config', function(){
    var config = require('./config.json');
    return gulp.src(['./config.json'])
      .pipe(replace({global:config.main}))
      .pipe(gulp.dest('./tmp'))
  });

gulp.task('token-replace', function(){
    var config = require('./tmp/config.json');
    return gulp.src(['./*.template.json', './*Task/*.template.json'])
      .pipe(rename(function (path){ path.basename = path.basename.slice(0,-9); }))
      .pipe(replace({global:config[conf]}))
      .pipe(gulp.dest('./'))
  });

gulp.task('default', gulp.series('token-replace-config', 'token-replace', 'clean-temp'));
