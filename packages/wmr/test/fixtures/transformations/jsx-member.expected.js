var _c0;
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
_c0 = Demo;
$RefreshReg$(_c0, 'Demo');
