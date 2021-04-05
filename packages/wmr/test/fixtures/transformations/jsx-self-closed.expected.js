import { html as $$html } from '/htm-jsx-factory.js';
const Bar = () => null;
const Bob = () => null;

export function Foo() {
	// prettier-ignore
	return $$html`<${Bar}><${Bob} /><//>`;
}
