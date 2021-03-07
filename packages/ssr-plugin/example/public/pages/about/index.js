import styles from './style.module.css';

const About = ({ query, title }) => (
	<section class={styles.about}>
		<h1>{title || 'About'}</h1>
		<p>My name is Jason.</p>
		<pre>{JSON.stringify(query)}</pre>
	</section>
);

export default About;
