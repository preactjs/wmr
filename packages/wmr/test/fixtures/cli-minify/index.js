const foo = {};

Object.defineProperty(foo, 'bar', {
	value: 42
});

console.log(foo.bar);
