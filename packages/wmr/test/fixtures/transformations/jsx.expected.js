var _c0;
import { html as $$html } from '/@npm/htm/preact';
const LIST = [
	{ id: 'one', text: 'item 1', props: {} },
	{ id: 'two', text: 'item 2', props: { class: 'foo' } },
	{ id: 'three', text: 'item 3' }
];

export default function Demo({ name = 'Bob', list = LIST }) {
	return (
		$$html`<div id="app">
			<h1>Hello</h1>
			<p>Name: ${name}</p>
			<ul>
				${list.map(item => (
					$$html`<li ...${item.props} key=${item.id}>
						${item.text}
					</li>`
				))}
			</ul>
			<br />
			<div>
				<img src="/static.jpg" />
				<img src=${'/string.jpg'} />
				<img src=${`/dynamic.${name}.jpg`} />
			</div>
		</div>`
	);
}
_c0 = Demo;
$RefreshReg$(_c0, 'Demo');
