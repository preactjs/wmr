import { html as $$html } from '/@npm/htm/preact';
const Bar = () => null;
const Bob = () => null;

export function Foo() {
	// prettier-ignore
	return $$html`<${Bar}><${Bob} /><//>`;
}
