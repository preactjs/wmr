import { useEffect } from 'preact/hooks';
import styles from './style.module.css';

export default function About({ query, title }) {
	useEffect(() => {
		console.log('Mounted About: ', title);
		return () => {
			console.log('Unmounting About: ', title);
		};
	}, []);
	return (
		<section class={styles.about}>
			<h1>{title || 'About'}</h1>
			<p>My name is Jason.</p>
			<pre>{JSON.stringify(query)}</pre>
		</section>
	);
}
