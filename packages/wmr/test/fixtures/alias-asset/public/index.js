import img1 from '../foo/img.jpg';
import img2 from 'foo/img.jpg';

let loaded = 0;
function loadImg(src) {
	const img = document.createElement('img');
	img.addEventListener('load', () => {
		if (++loaded === 2) {
			document.querySelector('h1').textContent = `it works`;
		}
	});
	img.src = src;
	document.body.appendChild(img);
}

loadImg(img1);
loadImg(img2);
