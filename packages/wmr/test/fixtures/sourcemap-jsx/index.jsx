import { render } from 'preact';

function App() {
	return <h1>it works</h1>;
}

document.getElementById('out').textContent = '';
render(<App />, document.getElementById('out'));
