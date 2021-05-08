import { useRoute } from 'preact-iso';

export default function Page() {
	const route = useRoute();
	console.log({ route });
	return <p>dynamic id: {route.params.id}</p>;
}
