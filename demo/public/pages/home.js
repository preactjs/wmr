import { useState } from 'preact/hooks';

export default function Home() {
	const [count, setCount] = useState(0);

	return (
		<>
			<section>
				<h1>Home</h1>
				{/* Note: the string below is used in E2E tests */}
				<p>This is the home page.</p>
				<>
					<button style={{ width: 30 }} onClick={() => setCount(count - 1)}>
						-
					</button>
					<output style={{ padding: 10 }}>Count: {count}</output>
					<button style={{ width: 30 }} onClick={() => setCount(count + 1)}>
						+
					</button>
				</>
			</section>
		</>
	);
}
