'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var merge = require('merge-stream');
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();

gulp.task('scripts', function() {
  return gulp.src([
      'node_modules/handlebars/dist/handlebars.js',
      'node_modules/fastclick/lib/fastclick.js',
      'node_modules/flickity/dist/flickity.pkgd.js',
      'node_modules/sticky-kit/dist/sticky-kit.js',
      'theme/assets/js/variant_selection.js',
      'theme/assets/js/shopify_jquery_ajax-api.js',
      'theme/assets/js/theme.js'
    ])
    .pipe($.newer('.build/assets/script.js.liquid'))
    .pipe($.concat('script.js'))
    .pipe($.rename({extname: '.js.liquid'}))
    .pipe(gulp.dest('.build/assets'));
});

gulp.task('sass', function() {
  return gulp.src('theme/assets/scss/styles.scss')
    .pipe($.newer({
      dest: '.build/assets',
      ext: '.css.liquid',
      extra: 'theme/assets/scss/**/*.scss'
    }))
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.rename({extname: '.css.liquid'}))
    .pipe(gulp.dest('.build/assets'));
});

gulp.task('copy', function() {
  var fonts = gulp.src('theme/assets/static/fonts/**/*')
    .pipe($.newer('.build/assets'))
    .pipe(gulp.dest('.build/assets'));

  var images = gulp.src('theme/assets/static/img/**/*')
    .pipe($.newer('.build/assets'))
    .pipe(gulp.dest('.build/assets'));

  var theme = gulp.src(['theme/**/*', '!theme/assets/**/*'])
    .pipe($.newer('.build'))
    .pipe(gulp.dest('.build'));

  return merge(fonts, images, theme);
});

gulp.task('serve', ['scripts', 'sass', 'copy'], function() {
  browserSync.init({
    proxy: 'https://fountrace.myshopify.com',
    injectChanges: false,
  });

  gulp.watch('theme/assets/scss/**/*.scss', ['sass']);
  gulp.watch('theme/assets/js/**/*.js', ['scripts']);
  gulp.watch([
    'theme/**/*',
    '!theme/assets/**/*',
    'theme/assets/static/img/**/*',
    'theme/assets/static/fonts/**/*'
  ], ['copy']);

  gulp.watch('/tmp/theme.update').on('change', browserSync.reload);
});

gulp.task('minify', function() {
  var sass = gulp.src('theme/assets/scss/styles.scss')
    .pipe($.sass({outputStyle: 'compressed'}).on('error', $.sass.logError))
    .pipe($.rename({extname: '.css.liquid'}))
    .pipe(gulp.dest('.build/assets'));

  var scripts = gulp.src('.build/assets/*.js.liquid')
    .pipe($.uglify())
    .pipe(gulp.dest('.build/assets'));

  var images = gulp.src('.build/assets/*.+(png|jpg|jpeg|gif|svg)')
    .pipe($.imagemin([
      $.imagemin.gifsicle(),
      $.imagemin.jpegtran(),
      $.imagemin.optipng(),
      $.imagemin.svgo({plugins: [{cleanupIDs: false}, {removeUselessDefs: false}]})
    ]))
    .pipe(gulp.dest('.build/assets'));

  return merge(sass, scripts, images);
});

gulp.task('clean', function() {
  return del(['.build/**/*', 'dist', '!.build/**/*.yml*']);
});

gulp.task('compress', function() {
  return gulp.src('.build/**/*')
    .pipe($.zip('your-theme-name.zip'))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['serve']);

gulp.task('build', ['scripts', 'sass', 'copy']);

gulp.task('dist', function() {
  runSequence('clean', ['scripts', 'copy'], 'minify', 'compress');
});
