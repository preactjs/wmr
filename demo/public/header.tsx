import { useLoc } from './lib/loc.js';
import { h } from 'preact';

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
				<a href="/env">Env</a>
				<a href="/error">Error</a>
			</nav>
			<label>
				URL:
				<input readonly value={url} ref={c => c && (c.size = c.value.length)} />
			</label>
		</header>
	);
}
