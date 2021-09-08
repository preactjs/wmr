class Foo {
	static state = 'class fields work';
}

document.getElementById('out').textContent = Foo.state;
