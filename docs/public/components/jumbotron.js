export default function Jumbotron() {
	return (
		<div class="jumbotron">
			<div class="brand">
				<img src="/assets/wmr.svg" class="brand-logo" alt="wmr logo" width="300" height="300" />
				<img src="/assets/wmr-shadow.svg" class="brand-shadow" alt="wmr logo" width="300" height="300" />
				<h1>WMR</h1>
			</div>
			<h2 class="tagline">
				The modern web app development tool for developers who don't like waiting for file changes to show up in the
				browser.
			</h2>
			<div class="cta">
				<a href="/docs" class="btn btn-primary">
					Get started
				</a>
				<a href="https://github.com/preactjs/wmr" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
					<img class="btn-img-left icon" src="/assets/github.svg" alt="" width="20" height="20" /> GitHub
				</a>
			</div>
		</div>
	);
}
