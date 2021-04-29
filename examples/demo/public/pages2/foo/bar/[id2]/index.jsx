import { useRoute } from 'preact-iso/router';

export default function Page() {
	const route = useRoute();
	return <p>dynamic id index: {route.params.id2}</p>;
}
