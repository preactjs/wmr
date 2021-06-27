import { useLocation } from 'preact-iso';

export type Foobar = any;

export default function Header(): Foo {
	const { url }: { url: string } = useLocation();
	return (
		<header>
			<nav>
				<a href="/">Home</a>
				<a href="/about">About</a>
				<a href="/lazy-and-late">Lazy and Late</a>
				<a href="/compat">Compat</a>
				<a href="/class-fields">Class-Fields</a>
				<a href="/files">Files</a>
				<a href="/env">Env</a>
				<a href="/json">JSON</a>
				<a href="/alias-outside">Alias outside</a>
				<a href="/error">Error</a>
				<a href="/meta-tags">Meta-Tags</a>
			</nav>
			<label>
				URL:
				<input readonly value={url} ref={c => c && (c.size = c.value.length)} />
			</label>
		</header>
	);
}
