import { styled } from 'goober';

const Section = styled('section')`
	align-items: center;
	display: flex;
	flex-direction: column;
`;

const H2 = styled('h2')`
	text-align: center;
	margin-top: 0;
`;

const H3 = styled('h3')`
	text-align: center;
	margin-top: 0;
`;

export default function Home() {
	return (
		<Section>
			<img src="/assets/wmr.png" alt="wmr logo" height="320" />
			<H2>The tiny all-in-one development tool for modern web apps, in a single 2mb file with no dependencies.</H2>
			<div>
				<H3>Getting started</H3>
				<div>
					<code>$ npm init wmr your-project-name</code>
				</div>
			</div>
		</Section>
	);
}
