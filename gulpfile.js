const gulp = require('gulp');
const del = require('del');
const ts = require('gulp-typescript');
const project = ts.createProject('tsconfig.json');

gulp.task('default', () => {
  del.sync(['dist/**', '!dist']);
  return project.src()
    .pipe(project())
    .js.pipe(gulp.dest('dist'));
});
