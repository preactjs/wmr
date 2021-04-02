import svg from 'my-url:./foo.svg';
import svg2 from 'url:./foo.svg';
import svg3 from './foo.svg';

const app = document.querySelector('#app');
if (app) {
	const addText = s => {
		const txt = document.createElement('p');
		txt.append(s);
		app.append(txt);
	};

	addText('my-url: ' + svg);
	addText('url: ' + svg2);
	addText('fallback: ' + svg3);
}
