import { h, createContext } from 'preact';
import { useContext, useMemo } from 'preact/hooks';

let id = 0;
function uuid() {
	return String(id++);
}

interface ComponentRegistration {
	script: string;
	specifier: string;
	componentId: string;
}

let hydrationComponentIdCounter = 0;

interface HydrationContext {
	registerComponent(component: ComponentRegistration): void;
	getComponents(): ComponentRegistration[];
}

export function HydrationContextProvider({ req, children }) {
	const hydrationContextValue = useMemo(() => {
		const components: ComponentRegistration[] = [];

		return {
			registerComponent(comp: ComponentRegistration) {
				if (components.find(c => c.componentId === comp.componentId)) {
					return;
				}

				components.push(comp);
			},
			getComponents() {
				return components;
			}
		};
	}, [req]);

	return <hydrationContext.Provider value={hydrationContextValue}>{children}</hydrationContext.Provider>;
}

const hydrationContext = createContext<HydrationContext | null>(null);

export function useHydrationRegistrations() {
	return useContext(hydrationContext)?.getComponents();
}

export function withHydration({ specifier, importUrl }: { specifier: string; importUrl: string }) {
	const componentId = String(hydrationComponentIdCounter++);

	return function (Component) {
		return function HydrateableComponent(props) {
			if (typeof document !== 'undefined') {
				return <Component {...props} />;
			}

			const ctx = useContext(hydrationContext);

			ctx?.registerComponent?.({
				script: importUrl.replace('http://0.0.0.0:8080', ''),
				specifier,
				componentId
			});

			const instanceId = uuid();

			return (
				<>
					<script
						type="application/hydrate"
						data-hydration-component-id={componentId}
						data-hydration-instance-id={instanceId}
						dangerouslySetInnerHTML={{ __html: JSON.stringify(props) }}
					/>
					<Component {...props} />
					<script type="application/hydrate-end" data-hydration-instance-id={instanceId} />
				</>
			);
		};
	};
}
