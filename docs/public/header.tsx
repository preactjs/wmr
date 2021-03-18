import { styled } from 'goober';

const HeaderArea = styled('header')`
	align-items: center;
	background-color: #96c5fd;
	display: flex;
	justify-content: space-between;
	padding: 8px 16px;
`;

const Link = styled('a')`
	color: #fff;
	cursor: pointer;
	font-weight: bold;
	height: 100%;
	padding: 0 1.25rem;
	text-align: center;
	text-decoration: none;
`;

export default function Header() {
	return (
		<HeaderArea>
			<nav>
				<Link href="/">Home</Link>
				<Link href="/docs">Docs</Link>
			</nav>
			<div>
				<Link href="https://github.com/preactjs/wmr">
					<img src="/assets/github.svg" alt="GitHub" width="34" height="34" />
				</Link>
				<Link href="https://twitter.com/preactjs">
					<img src="/assets/twitter.svg" alt="Twitter" width="34" height="34" />
				</Link>
			</div>
		</HeaderArea>
	);
}
