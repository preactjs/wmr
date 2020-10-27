import { App } from './app';
import { Hydratable } from './hydrateable';
import { HydrationContextProvider, useHydrationRegistrations } from './with-hydration';

function importAlias(componentId: string): string {
	return `Component_${componentId}`;
}

function HydrationScripts() {
	const components = useHydrationRegistrations();

	if (!components || components.length === 0) {
		return null;
	}

	return (
		<script
			type="module"
			dangerouslySetInnerHTML={{
				__html: `
			import { hydrate } from '/hydrate.tsx';${components
				.map(
					({ specifier, script, componentId }, i) => `
				import ${
					specifier === 'default'
						? importAlias(componentId)
						: `{ ${specifier} as ${importAlias(componentId)} } from '${script}';`
				}`
				)
				.join('')}

			hydrate({${components
				.map(
					({ specifier, script, componentId }, i) => `
					'${componentId}': ${importAlias(componentId)},`
				)
				.join('')}
			});
		`
			}}
		/>
	);
}

export function Document({ req }) {
	return (
		<HydrationContextProvider req={req}>
			<html>
				<head></head>
				<body>
					<App />
					<Hydratable foo="bar" baz="bal" />
					<HydrationScripts />
				</body>
			</html>
		</HydrationContextProvider>
	);
}
