const other = require('./other.js');

console.log(other);

document.querySelector('#cjsimport').textContent = JSON.stringify(other);

exports.a = 'one';
exports.b = 'two';
