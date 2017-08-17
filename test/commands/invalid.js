const handles = require('../../dist/index');

exports.middleware = function* () {
  yield new handles.Validator()
    .apply(false);
};
