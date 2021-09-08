import { win32 } from './bar.js';

document.querySelector('h1').textContent = win32 ? 'it works' : "it doesn't work";
