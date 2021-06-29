import styles from './styles/foo.module.css';

document.querySelector('.foo')?.classList.add(styles.foo);

if (import.meta.hot) {
	let m = import(import.meta.url);
	import.meta.hot?.accept(async ({ module }) => {
		m = await m;
		document.querySelector('.foo')?.classList.add(styles.foo);
	});
}
