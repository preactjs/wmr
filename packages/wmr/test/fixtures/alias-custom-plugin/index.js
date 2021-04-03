import { foo } from '~/foo.js';
import json from 'json:~/foo.json';

const app = document.querySelector('#app');
app.textContent = `${foo} ${JSON.stringify(json)}`;
