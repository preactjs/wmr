import { useState } from 'preact/hooks';
import styles from './style.module.css';

export default function Home() {
	const [count, setCount] = useState(0);
	return (
		<section class={styles.home}>
			<h1>Home</h1>
			<p>This is the home page.</p>
			<output>Count: {count}</output>
			<button onClick={() => setCount(count + 1)}>+</button>
		</section>
	);
}
