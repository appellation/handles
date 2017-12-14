exports.exec = function() {
  console.log(this);
  const s = this.response.send;
  s('d');
  s('a');
  s('n');
  s('k');
};
