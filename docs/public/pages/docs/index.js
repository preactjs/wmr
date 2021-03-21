import { styled } from 'goober';

const Code = styled('code')`
	background-color: black;
	color: white;
	padding: 16px;
	margin-bottom: 8px;
`;

const SmallCode = styled('code')`
	color: grey;
	padding: 16px;
`;

const SetupContainer = styled('div')`
	display: flex;
	flex-direction: column;
`;

export default function GettingStarted() {
	return (
		<section>
			<h1>Getting started</h1>
			<p>
				WMR is <b>The tiny all-in-one development tool for modern web apps</b>, in a single 2mb file with no dependencies.<br />
				Some of the features you can find in wmr:
			</p>
			<ul>
				<li>🔨 No entry points or pages to configure, just HTML files with <code>&lt;script type="module"&gt;</code></li>
				<li>🦦 Safely import packages from npm <b>without installation</b></li>
				<li>📦 Smart bundling and caching for npm dependencies</li>
				<li>↻ Hot reloading for modules, Preact components and CSS</li>
				<li>⚡️ Lightning-fast JSX support that you can debug in the browser</li>
				<li>💄 Import CSS files and <a href="https://github.com/css-modules/css-modules" target="blank" rel="noreferrer">CSS Modules</a></li>
				<li>🔩 Out-of-the-box support for <a href="https://www.typescriptlang.org/" target="blank" rel="noreferrer">TypeScript</a></li>
				<li>📂 Static file serving with hot reloading of CSS and images</li>
				<li>🗜  Highly optimized Rollup-based production output ("wmr build")</li>
				<li>📑 Crawls and pre-renders your app's pages to static HTML at build time</li>
				<li>🏎 Built-in HTTP2 in dev and prod ("wmr serve --http2")</li>
				<li>🔧 Supports Rollup plugins, even in development where Rollup isn't used</li>
			</ul>
			<h2>Automatic setup</h2>
			<SetupContainer>
				<Code>$ npm init wmr your-project-name</Code>
				<img src="https://user-images.githubusercontent.com/105127/100917537-4661e100-34a5-11eb-89bd-565b7bc31919.gif"></img>
			</SetupContainer>

			<h2>Manual setup</h2>
			<p>First we'll have to install the "wmr" dependency.</p>
			<SmallCode>$ npm i -D wmr</SmallCode>
			<p>Next we'll have to create a "publix/index.html" file, like <a target="blank" rel="noreferrer" href="https://github.com/preactjs/wmr/blob/main/packages/wmr/demo/public/index.html">this one</a></p>
			<p>We'll see that we reference a file from here, "index.js" you are also allowed to make this ".tsx" and so on.</p>
		</section>
	);
}
