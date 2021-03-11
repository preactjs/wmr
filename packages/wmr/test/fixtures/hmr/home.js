import useCounter from './useCounter.js';

function Counter() {
	const [count, increment] = useCounter();
	return (
		<>
			<p class="count">{count}</p>
			<p class="increment" onClick={increment}>
				Increment
			</p>
		</>
	);
}

function Home() {
	return (
		<div>
			<p class="home">Home</p>
			<Counter />
		</div>
	);
}

export default Home;
