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
				<p>State: {this.state.value}</p>
				<button onClick={this.onClick}>click me</button>
			</div>
		);
	}
}
