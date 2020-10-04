import { useLoc } from './loc.js';

export default function Header() {
	const { url }: { url: string } = useLoc();
	return (
		<header>
			<nav>
				<a href="/">Home</a>
				<a href="/about">About</a>
				<a href="/compat">Compat</a>
				<a href="/class-fields">Class-Fields</a>
				<a href="/files">Files</a>
				<a href="/node-resolve">Node Resolution</a>
				<a href="/error">Error</a>
			</nav>
			<label>
				URL:
				<input readonly value={url} ref={c => c && (c.size = c.value.length)} />
			</label>
		</header>
	);
}
