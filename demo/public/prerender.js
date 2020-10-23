import { App } from './index.tsx';
import renderToString from 'preact-render-to-string';

export default function ssr({ url }) {
	return renderToString(<App />);
}

// console.log('SSR: ', ssr());
