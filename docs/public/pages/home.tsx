import { styled } from 'goober';

const Section = styled('section')`
	align-items: center;
	display: flex;
	flex-direction: column;
	padding: 32px 0;
`;

const H2 = styled('h2')`
	text-align: center;
	margin-top: 0;
	max-width: 70%;
`;

const H3 = styled('h3')`
	text-align: center;
	margin-top: 0;
`;

const Code = styled('code')`
	background-color: black;
	color: white;
	padding: 16px;
`;

export default function Home() {
	return (
		<Section>
			<img src="/assets/wmr.svg" alt="wmr logo" width="300" />
			<H2>The tiny all-in-one development tool for modern web apps, in a single 2mb file with no dependencies.</H2>
			<div>
				<H3>Getting started</H3>
				<Code>$ npm init wmr your-project-name</Code>
			</div>
		</Section>
	);
}
