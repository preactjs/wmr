let meta;
export default function Meta({ title, description }) {
	document.title = 'WMR: ' + title;
	if (!meta || !meta.parentNode) {
		meta = document.createElement('meta');
		meta.name = 'description';
		meta.content = description;
		document.head.appendChild(meta);
	}
}
