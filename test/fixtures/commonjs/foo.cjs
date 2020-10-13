const other = require('./mixed.js');

console.log(other);

let collected = {};
for (let i in other) collected[i] = other[i];
collected.default = other.default;

document.querySelector('#cjsimport').textContent = JSON.stringify(collected);

exports.a = 'one';
exports.b = 'two';
