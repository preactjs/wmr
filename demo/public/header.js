import { useLoc } from './loc.js';

export default function Header() {
	const { url } = useLoc();
	return (
		<header>
			<nav>
				<a href="/">Home</a>
				<a href="/about">About</a>
				<a href="/error">Error</a>
			</nav>
			<section>
				URL:
				<input readonly value={url} />
			</section>
		</header>
	);
}
