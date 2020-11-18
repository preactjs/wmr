import styles from './style.module.css';

export default function Profile({ username }) {
	return (
		<section class={styles.profile}>
			<h1>Profile</h1>
			<p>This is the profile page for {username}.</p>
		</section>
	);
}
