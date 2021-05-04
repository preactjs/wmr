import { useLocation } from 'preact-iso';

export default function Header() {
	const { url } = useLocation();
	return (
		<header>
			<nav>
				<a href="/">Home</a>
				<a href="/about">About</a>
				<a href="/error">Error</a>
			</nav>
			<label>
				URL:
				<input readonly value={url} ref={c => c && (c.size = c.value.length)} />
			</label>
		</header>
	);
}
