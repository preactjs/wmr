export default function Header() {
	return (
		<header class="header">
			<nav>
				<a href="/">Home</a>
				<a href="/docs">Docs</a>
			</nav>
			<nav>
				<a href="https://github.com/preactjs/wmr" target="_blank" rel="noopener noreferrer">
					<img src="/assets/github.svg" alt="WMR on GitHub" width="34" height="34" />
				</a>
				<a href="https://twitter.com/preactjs" target="_blank" rel="noopener noreferrer">
					<img src="/assets/twitter.svg" alt="@preactjs on Twitter" width="34" height="34" />
				</a>
			</nav>
		</header>
	);
}
