import { render } from 'preact';
import { useReducer } from 'preact/hooks';
import { TopAppBar, TopAppBarRow, TopAppBarSection, TopAppBarTitle, TopAppBarNavigationIcon } from '@rmwc/top-app-bar';
import '@material/top-app-bar/dist/mdc.top-app-bar.css';
import '@material/icon-button/dist/mdc.icon-button.css';
import { Drawer, DrawerHeader, DrawerTitle, DrawerSubtitle, DrawerContent } from '@rmwc/drawer';
import '@material/drawer/dist/mdc.drawer.css';
import { List, ListItem } from '@rmwc/list';
import '@material/list/dist/mdc.list.css';

export default function App() {
	const [open, toggle] = useReducer(open => !open, false);

	return (
		<div id="app">
			<TopAppBar fixed>
				<TopAppBarRow>
					<TopAppBarSection alignStart>
						<TopAppBarNavigationIcon icon="☰" onClick={toggle} />
						<TopAppBarTitle>RMCW</TopAppBarTitle>
					</TopAppBarSection>
				</TopAppBarRow>
			</TopAppBar>
			<Drawer modal open={open} onClose={toggle}>
				<DrawerHeader>
					<DrawerTitle>DrawerHeader</DrawerTitle>
					<DrawerSubtitle>Subtitle</DrawerSubtitle>
				</DrawerHeader>
				<DrawerContent>
					<List>
						<ListItem>Cookies</ListItem>
						<ListItem>Pizza</ListItem>
						<ListItem>Icecream</ListItem>
					</List>
				</DrawerContent>
			</Drawer>
		</div>
	);
}

render(<App />, document.body);
