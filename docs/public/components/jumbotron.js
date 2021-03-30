export default function Jumbotron() {
	return (
		<div class="jumbotron">
			<div class="brand">
				<img src="/assets/wmr.svg" class="brand-logo" alt="wmr logo" width="300" height="300" />
				<h1>WMR</h1>
			</div>
			<h2 class="tagline">The tiny all-in-one development tool for modern web apps.</h2>
			<div class="cta">
				<a href="/docs" class="btn btn-primary">
					Get started
				</a>
				<button class="btn btn-secondary">
					<img class="btn-img-left icon" src="/assets/github.svg" alt="" width="20" height="20" /> GitHub
				</button>
			</div>
			<div>
				<code>
					npm init create-wmr my-project <button>clip</button>
				</code>
			</div>
		</div>
	);
}
