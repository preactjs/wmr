import { value } from '../../src/outside.js';
import { value as inside } from '../foo/alias-inside.js';

export default function AliasOutside() {
	return (
		<div>
			<p>Inside: {inside}</p>
			<p>Outside: {value}</p>
		</div>
	);
}
