import { h, hydrate as preactHydrate } from 'preact';

export function hydrate(components: Record<string, any>) {
	Array.from(document.querySelectorAll('script[type="application/hydrate"]')).forEach((startEl: HTMLElement) => {
		const props = JSON.parse(startEl.innerHTML);
		const endEl = document.querySelector(
			'script[type="application/hydrate-end"][data-hydration-instance-id="' + startEl.dataset.hydrationInstanceId + '"]'
		);

		if (!endEl) {
			return;
		}

		const childNodes: ChildNode[] = [];
		let currentNode = startEl.nextSibling;
		while (currentNode != null && currentNode !== endEl) {
			childNodes.push(currentNode);
			currentNode = currentNode.nextSibling;
		}

		preactHydrate(h(components[startEl.dataset.hydrationComponentId!], props), {
			// @ts-expect-error
			childNodes,
			// @ts-expect-error
			appendChild: function (c) {
				startEl.parentNode?.insertBefore?.(c, endEl);
			}
		});
	});
}
