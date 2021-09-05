import { value } from './dep-b';

addEventListener('message', () => {
	postMessage(value);
});

export const foo = 42;
