import { bar } from './foo.js';

const p = document.createElement('p');
p.textContent = `Check the Network tab for the amount of requests. Result of bar(): ${bar()}`;
document.body.appendChild(p);
