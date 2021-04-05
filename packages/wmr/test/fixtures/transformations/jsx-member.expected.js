import { html as $$html } from '/htm-jsx-factory.js';
const Ctx = {
	Foo: function Foo() {
		return $$html`<div />`;
	}
};

export default function Demo() {
	return (
		$$html`<${Ctx.Foo} value=${{ foo: 123 }}>
			<div />
		<//>`
	);
}
