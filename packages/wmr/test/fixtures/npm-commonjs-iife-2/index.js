import { isElement } from 'foo';

document.querySelector('h1').textContent = typeof isElement === 'function' ? 'it works' : "it doesn't work";
