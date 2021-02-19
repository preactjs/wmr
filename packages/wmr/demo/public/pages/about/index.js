import styles from './style.module.css';

const About = ({ query }) => (
	<section class={styles.about}>
		<h1>About</h1>
		<p>My name is Jason.</p>
		<pre>{JSON.stringify(query)}</pre>
	</section>
);

export default About;
