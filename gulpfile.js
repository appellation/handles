const gulp = require('gulp');
const del = require('del');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const typedoc = require('gulp-typedoc');
const mergeStream = require('merge-stream');
const project = ts.createProject('tsconfig.json');

function build() {
  del.sync(['dist/**', '!dist']);
  del.sync(['typings/**', '!typings']);

  const result = project.src()
    .pipe(sourcemaps.init())
    .pipe(project());

  return mergeStream(
    result.dts.pipe(gulp.dest('typings')),
    result.js.pipe(sourcemaps.write('.', { sourceRoot: '../src' })).pipe(gulp.dest('dist')),
  );
}

function docs() {
  del.sync(['docs/**']);
  return gulp.src(['src/*.ts'])
    .pipe(typedoc({
      module: 'commonjs',
      target: 'es2017',
      out: './docs',
    }));
}

gulp.task('default', build);
gulp.task('build', build);
gulp.task('docs', docs);
