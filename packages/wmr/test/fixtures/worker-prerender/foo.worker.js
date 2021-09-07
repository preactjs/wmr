import { value } from './dep';

addEventListener('message', () => {
	postMessage(value);
});

export const foo = 42;
