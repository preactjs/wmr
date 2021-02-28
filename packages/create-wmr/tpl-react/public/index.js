import ReactDom from 'react-dom';

export function App() {
	return (
		<div className="app">
			<h1>Welcome to wmr React</h1>
		</div>
	);
}

ReactDom.render(<App />, document.getElementById('root'));
