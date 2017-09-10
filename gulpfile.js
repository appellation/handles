const gulp = require('gulp');
const del = require('del');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const typedoc = require('gulp-typedoc');
const project = ts.createProject('tsconfig.json');

gulp.task('default', ['build']);

gulp.task('build', () => {
  del.sync(['dist/**', '!dist']);
  del.sync(['typings/**', '!typings']);

  const result = project.src()
    .pipe(sourcemaps.init())
    .pipe(project());

  result.dts.pipe(gulp.dest('typings'));
  result.js.pipe(sourcemaps.write('.', { sourceRoot: '../src' })).pipe(gulp.dest('dist'));
});

gulp.task('docs', () => {
  del.sync(['docs/**']);
  return gulp.src(['src/*.ts'])
    .pipe(typedoc({
      module: 'commonjs',
      target: 'es2017',
      out: './docs',
    }));
});
