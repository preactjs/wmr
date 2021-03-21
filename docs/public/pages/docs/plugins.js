import { styled } from 'goober';

export default function GettingStarted() {
	return (
		<section>
			<h1>Plugins</h1>
			<h2>First-party</h2>
			<ul>
				<li><a href="https://github.com/preactjs/wmr/tree/main/packages/directory-plugin" target="blank" rel="noreferrer">directory import plugin</a></li>
				<li><a href="https://github.com/preactjs/wmr/tree/main/packages/nomodule-plugin" target="blank" rel="noreferrer">nomodule plugin</a></li>
				<li><a href="https://github.com/preactjs/wmr/tree/main/packages/sw-plugin" target="blank" rel="noreferrer">service-worker plugin</a></li>
			</ul>
			<h2>Community</h2>
			<ul>
				<li><a href="https://github.com/Elliotclyde/wmr-vue-plugin" target="blank" rel="noreferrer">Vue plugin</a></li>
			</ul>
		</section>
	);
}
