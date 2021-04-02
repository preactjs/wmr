import json from 'my-json:./foo.json';
import json2 from 'json:./bar.json';
import json3 from './baz.json';

const app = document.querySelector('#app');
if (app) {
	app.textContent = json.foo + json2.bar + json3.baz;
}
