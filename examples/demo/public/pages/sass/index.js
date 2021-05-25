import stylesModule from './style.module.scss';
import stylesPartialModule from './style.partial.module.scss';
import stylesStandalone from './style.standalone.scss';
import stylesPartialStandalone from './style.partial.standalone.scss';
import { useState } from 'preact/hooks';

export default function Sass() {
	const [count, setCount] = useState(0);

	return (
		<>
      <h1>None of the following text should be black after HMR</h1>
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
			<ul class={stylesPartialModule.sass}>
			  <li class={stylesPartialModule.nesting}>Partial Module Nested</li>
			  <li class="global">Partial Module Global</li>
        <li class="global"><span class={stylesPartialModule.local}>Partial Module Global Local</span></li>
			  <li class={stylesPartialModule.variable}>Partial Module Variable</li>
			  <li class={stylesPartialModule.mixin}>Partial Module Mixin</li>
			</ul>
			<ul class="sass1">
			  <li class="nesting1">Partial File Nested</li>
			  <li class="variable1">Partial File Variable</li>
			  <li class="mixin1">Partial File Mixin</li>
			</ul>
		</>
	);
}
