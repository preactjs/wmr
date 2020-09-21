import { h } from 'preact';

function Foo(props) {
	return <div>{props.foo}</div>;
}

export function NestedJsx() {
	return <Foo foo={<p />} />;
}
