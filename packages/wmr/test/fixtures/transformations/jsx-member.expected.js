import { html as $$html } from '/@npm/htm/preact';
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
