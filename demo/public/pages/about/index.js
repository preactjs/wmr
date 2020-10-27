import { Hydratable } from '../../hydrateable2';
import styles from './style.module.css';

const About = ({ query }) => (
	<section class={styles.about}>
		<h1>About</h1>
		<p>My name is Jason.</p>
		<pre>{JSON.stringify(query)}</pre>
		<Hydratable query={query} />
	</section>
);

export default About;
