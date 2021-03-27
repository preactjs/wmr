import { foo } from '~/index.js';

export default function AliasDemo() {
	return (
		<div>
			<p>~/foo: {foo}</p>
		</div>
	);
}
