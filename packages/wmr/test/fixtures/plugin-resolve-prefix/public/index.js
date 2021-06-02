import { value } from 'url:./foo.js';

document.querySelector('h1').textContent = `Resolved: ${value}`;
