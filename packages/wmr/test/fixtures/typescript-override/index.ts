class A {
	hi() {}
}

class B extends A {
	override hi() {
		return 'it works';
	}
}

document.querySelector('h1').textContent = new B().hi();
