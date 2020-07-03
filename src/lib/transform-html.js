import posthtml from 'posthtml';

/** @typedef {(url: string, attr: string, tag: string, node: posthtml.Node) => string|false|null} Transformer */

/**
 * @param {object} opts
 * @param {Transformer} opts.transformUrl
 * @returns {posthtml.Plugin<null>}
 */
function transformUrls({ transformUrl }) {
	const cache = new Map();
	const preloads = [];

	/** @param {posthtml.Node} node, @param {string} attr */
	function transform(node, attr) {
		const { tag, attrs } = node;
		const url = attrs && attrs[attr];
		if (typeof tag === 'string' && url) {
			const out = transformUrl(url, attr, tag, node);
			if (out != null && out !== false) {
				attrs[attr] = out;
				cache.set(url, out);
			}
		}
	}

	return async tree => {
		tree.walk(node => {
			switch (node.tag) {
				case 'script':
					transform(node, 'src');
					break;
				case 'link':
					// automatically handle <link rel=preload> by updating after url mappings
					if (/(preload|prefetch)/.test(node.attrs.rel)) {
						preloads.push(node);
					} else {
						transform(node, 'href');
					}
					break;
			}
			return node;
		});
		preloads.forEach(link => {
			const url = link.attrs.href;
			if (cache.has(url)) {
				link.attrs.href = cache.get(url);
			}
		});
	};
}

/**
 * @param {string} html
 * @param {object} options
 * @param {Transformer} options.transformUrl
 */
export async function transformHtml(html, { transformUrl }) {
	const transformer = posthtml([transformUrls({ transformUrl })]);
	const result = await transformer.process(html);
	return result.html;
}
