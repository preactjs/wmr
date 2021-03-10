var _c0, _c1, _c2;
import { html as $$html } from '/@npm/htm/preact';
const Bar = () => null;
_c0 = Bar;
const Bob = () => null;
_c1 = Bob;
export function Foo() {
	// prettier-ignore
	return $$html`<${Bar}><${Bob} /><//>`;
}
_c2 = Foo;
$RefreshReg$(_c0, 'Bar');
$RefreshReg$(_c1, 'Bob');
$RefreshReg$(_c2, 'Foo');
