import { h, createContext } from 'preact';
import { useContext, useMemo } from 'preact/hooks';

interface ComponentRegistration {
	script: string;
	specifier: string;
	targetSelector: string;
}

let hydrationComponentIdCounter = 0;
let hydrationDataIdCounter = 0;

interface HydrationContext {
	registerComponent(component: ComponentRegistration): void;
	getComponents(): ComponentRegistration[];
}

export function HydrationContextProvider({ req, children }) {
	const hydrationContextValue = useMemo(() => {
		const components: ComponentRegistration[] = [];

		return {
			registerComponent(comp: ComponentRegistration) {
				if (components.find(c => c.targetSelector === comp.targetSelector)) {
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
				targetSelector: `[data-hydration-component-id="${componentId}"]`
			});

			const dataId = String(hydrationDataIdCounter++);

			return (
				<>
					<div data-hydration-component-id={componentId} data-hydration-data-id={dataId}>
						<Component {...props} />
					</div>
					<script
						type="application/hydration-data"
						data-hydration-data-id={dataId}
						dangerouslySetInnerHTML={{ __html: JSON.stringify(props) }}
					/>
				</>
			);
		};
	};
}
