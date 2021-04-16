import { Component } from 'preact';

export default class ClassFields extends Component {
	state = {
		value: 1
	};

	onClick = () => {
		this.setState(prev => ({ value: prev.value + 1 }));
	};

	render() {
		return (
			<div>
				<p>
					State: <span>{this.state.value}</span>
				</p>
				<button onClick={this.onClick}>click me</button>
			</div>
		);
	}
}
