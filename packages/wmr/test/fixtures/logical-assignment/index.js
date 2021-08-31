function example(opts) {
	opts.foo ??= 'bar';
	opts.baz ??= 'qux';

	return opts;
}

const out = document.getElementById('out');
out.textContent = JSON.stringify(example({ foo: 'foo' }));
