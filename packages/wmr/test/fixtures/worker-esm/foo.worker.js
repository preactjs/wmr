import { value } from './dep-b';

addEventListener('message', () => {
	postMessage(value);
});
