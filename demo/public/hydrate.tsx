import { hydrate as preactHydrate } from 'preact';

export function hydrate(targetSelector, Component) {
	Array.from(document.querySelectorAll(targetSelector)).forEach(el => {
		const dataEl = document.querySelector(
			`script[type="application/hydration-data"][data-hydration-data-id="${el.dataset.hydrationDataId}"]`
		) as HTMLScriptElement | undefined;

		const props = (dataEl && JSON.parse(dataEl.innerHTML)) ?? {};

		preactHydrate(<Component {...props} />, el);
	});
}
