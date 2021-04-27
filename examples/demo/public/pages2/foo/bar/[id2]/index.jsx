import { useRoute } from 'preact-iso/router';

export default function Page() {
	const route = useRoute();
	return <p>dynamic id index: {route.id2}</p>;
}
