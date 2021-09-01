import { html as $$html } from '/@npm/htm/preact';
// prettier-ignore
export const a = $$html`<div
	id="foo"
	disabled
	/>`

// prettier-ignore
export const b = $$html`<div
	id="foo"
	/>`

const Foo = () => null;
// prettier-ignore
export const c = $$html`<div
	id="foo"
	>
	<${Foo}  foo=${2} />
</div>`
