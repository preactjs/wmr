import { useLang, useTitle, useTitleTemplate, useMeta, useLink } from 'hoofd/preact';

// Test meta tags prerendering
export function MetaTags() {
	// Will set <html lang="en">
	useLang('nl');

	// Will set title to "Welcome to hoofd | 💭"
	useTitleTemplate('%s | 💭');
	useTitle('Welcome to hoofd');

	// Credits to an amazing person
	useMeta({ name: 'author', content: 'Jovi De Croock' });
	useLink({ rel: 'me', href: 'https://jovidecroock.com' });

	return (
		<div>
			<h1>Meta tag rendering</h1>
			<p>...check document.head in devtools</p>
		</div>
	);
}
