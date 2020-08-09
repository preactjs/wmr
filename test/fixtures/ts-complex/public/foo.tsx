import { bar } from './bar';
import { baz } from './baz';

export function Foo() {
	return (
		<p id="result">
			{bar()}
			{baz()}
		</p>
	);
}
