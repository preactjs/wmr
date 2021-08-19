import jpg from './img.jpg';

export default function Files() {
	return (
		<div style="padding: 2rem;">
			<h1>Files</h1>
			<p>
				jpg: {jpg}
				<br />
				<img src={jpg} alt="" height="320" />
			</p>
		</div>
	);
}
