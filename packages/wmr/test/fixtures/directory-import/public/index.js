import files from 'dir:./foo';

const list = document.querySelector('ul');

files.forEach(file => {
	const el = document.createElement('li');
	el.textContent = file;
	list.appendChild(el);
});
