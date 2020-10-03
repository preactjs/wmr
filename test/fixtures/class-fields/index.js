class Foo {
	state = { value: 'class fields work' };
	onLoad = () => {
		return this.state;
	};
}

const out = document.getElementById('out');
if (!out) {
	throw new Error("Element with id 'out' is missing in DOM");
}

const foo = new Foo();
out.textContent = foo.onLoad().value;
