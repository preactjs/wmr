import stylesModule from './style.module.scss';
import stylesFile from './style.scss';
import { useState } from 'preact/hooks';

export default function Sass() {
	const [count, setCount] = useState(0);

	return (
		<>
      <h1>None of the following text should be black</h1>
			<ul class={stylesModule.sass}>
			  <li class={stylesModule.nesting}>Module Nested</li>
			  <li class="global">Module Global</li>
        <li class="global"><span class={stylesModule.local}>Module Global Local</span></li>
			  <li class={stylesModule.variable}>Module Variable</li>
			  <li class={stylesModule.mixin}>Module Mixin</li>
			</ul>
			<ul class="sass">
			  <li class="nesting">File Nested</li>
			  <li class="variable">File Variable</li>
			  <li class="mixin">File Mixin</li>
			</ul>
		</>
	);
}
