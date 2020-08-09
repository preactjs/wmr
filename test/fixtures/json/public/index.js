// @ts-ignore
import json from './foo.json';

const p = document.body.querySelector('p');
p.textContent = JSON.stringify(json);
p.id = 'result';
