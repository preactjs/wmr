// prettier-ignore
export const a = <div
	// comment 1
	id="foo"
	// comment 2
	disabled
	// comment 3
	/>

// prettier-ignore
export const b = <div
	// comment 1.1
	// comment 2.2
	id="foo"
	// comment 3.3
	// comment 3.4
	/>

const Foo = () => null;
// prettier-ignore
export const c = <div
	/* a */
	id="foo"
	/* b */
	/* c */
	>
	<Foo /*asd*/ foo={2} /*asd*//>
</div>
