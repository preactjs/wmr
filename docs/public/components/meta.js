import { useTitle, useMeta } from 'hoofd/preact';

export default function Meta({ title, description }) {
	useTitle('WMR: ' + title);
	useMeta({ name: 'description', content: description });
	return null;
}
