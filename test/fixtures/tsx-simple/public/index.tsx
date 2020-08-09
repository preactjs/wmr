import { h, render } from 'preact';

render(
	<div id="result">
		foo
		<>
			<div>bar</div>
			<div>baz</div>
		</>
	</div>,
	document.getElementById('app')
);
