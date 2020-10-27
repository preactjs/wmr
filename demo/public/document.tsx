import { App } from './app';
import { Hydratable } from './hydrateable';
import { HydrationContextProvider, useHydrationRegistrations } from './with-hydration';

function HydrationScripts() {
	const components = useHydrationRegistrations();

	return (
		<>
			{components?.map(({ specifier, script, targetSelector }, i) => {
				const importAs = 'Component';

				return (
					<script
						key={i}
						type="module"
						dangerouslySetInnerHTML={{
							__html: `
							import ${specifier === 'default' ? importAs : `{ ${specifier} as ${importAs} } from '${script}';`}
							import { hydrate } from '/hydrate.tsx';
							hydrate('${targetSelector}', ${importAs});
						`
						}}
					/>
				);
			})}
		</>
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
