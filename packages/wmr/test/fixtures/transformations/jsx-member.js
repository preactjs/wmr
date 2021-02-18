const Ctx = {
	Foo: function Foo() {
		return <div />;
	}
};

export default function Demo() {
	return (
		<Ctx.Foo value={{ foo: 123 }}>
			<div />
		</Ctx.Foo>
	);
}
