/* eslint-disable */
// @ts-nocheck

window.capitalize = function capitalize(str) {
	return str.toUpperCase();
};

!(function (e, n) {
	'object' == typeof exports && 'undefined' != typeof module
		? (module.exports = n(require('capitalize')))
		: 'function' == typeof define && define.amd
		? define(['capitalize'], n)
		: (e.foo = n(e.capitalize));
})(this, function (capitalize) {
	document.querySelector('h1').textContent = capitalize('external script loaded');
});
