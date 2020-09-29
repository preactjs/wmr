import { useLoc } from './loc.js';

export default function Header() {
	const { url }: { url: string } = useLoc();
	return (
		<header>
			<nav>
				<a href="/">Home</a>
				<a href="/about">About</a>
				<a href="/compat">Compat</a>
				<a href="/error">Error</a>
				<a href="/landing">Landing</a>
			</nav>
			<label>
				URL:
				<input readonly value={url} ref={c => c && (c.size = c.value.length)} />
			</label>
		</header>
	);
}
