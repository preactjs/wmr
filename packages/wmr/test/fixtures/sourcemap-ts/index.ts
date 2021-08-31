export interface Foo {
	foo: string;
}

function getFoo(foo: Foo) {
	return foo.foo;
}

document.getElementById('out').textContent = getFoo({ foo: 'it works' });
