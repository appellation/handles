const gulp = require('gulp');
const ts = require('gulp-typescript');
const project = ts.createProject('tsconfig.json');

gulp.task('default', () => {
  return project.src()
    .pipe(project())
    .js.pipe(gulp.dest('dist'));
});
