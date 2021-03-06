import { styled } from 'goober';
import pages from 'dir:./docs';

const links = pages.map(name => ({
	name: name.replace(/(index)?\.\w+$/, ''),
  url: '/docs/' + name.replace(/(index)?\.\w+$/, '')
}));

const Link = styled('a')`
	color: #bbb;
	cursor: pointer;
	font-weight: bold;
	height: 100%;
	text-decoration: none;
`;

const ListItem = styled('li')`
	list-style: none;
	padding: 4px;
`;

export default function SideBar() {
	return (
		<ul>
			{links.map((link, i) => (
				<ListItem key={i}>
					<Link href={link.url}>{link.name || 'Getting started'}</Link>
				</ListItem>
			))}
		</ul>
	)
}
