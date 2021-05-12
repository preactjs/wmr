import { it } from '../foo/it.js';
import { works } from 'foo/works.js';

document.querySelector('h1').textContent = `${it} ${works}`;
