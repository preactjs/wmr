import path from 'path';
import { pluginA } from './wmr/a.mjs';

export default function wmr() {
	// Random path usage to check if it works
	const random = path.join('foo', 'bar').split(path.sep).join(path.posix.sep);
	return {
		plugins: [{ name: random }, pluginA()]
	};
}
