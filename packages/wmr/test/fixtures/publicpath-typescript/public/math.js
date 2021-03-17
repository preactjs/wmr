import styles from './math.css';

export function add(x, y) {
	console.log('math styles', styles);
	return import('./constants.js').then(mod => {
		return x + y + mod.minimum;
	});
}
