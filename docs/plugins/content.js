import marked from 'marked';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';

export default function contentPlugin(config, opts) {
	config.plugins.push(contentRollupPlugin({ ...config, ...opts }));
}
contentPlugin.rollup = contentRollupPlugin;

async function tree(dir, prefix = '') {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const list = await Promise.all(
		entries.map(entry => {
			if (entry[0] === '.') return;
			const name = (prefix ? prefix + '/' : '') + entry.name;
			if (entry.isDirectory()) return tree(path.join(dir, entry.name), name);
			return name;
		})
	);
	return list.flat().filter(Boolean);
}

const FRONT_MATTER_REG = /^\s*---\n\s*([\s\S]*?)\s*\n---\n/i;
const TITLE_REG = /^\s*#\s+(.+)\n+/;
async function getMeta(filename) {
	let meta = {};
	let content = await fs.readFile(filename, 'utf-8');
	content = content.replace(FRONT_MATTER_REG, (s, fm) => {
		meta = yaml.parse('---\n' + fm.replace(/^/gm, '  ') + '\n') || meta;
		return '';
	});
	content = content.replace(TITLE_REG, s => {
		if (!meta.title) meta.title = s;
		return '';
	});
	content = decodeHtmlEntities(marked(content));
	if (!meta.description) {
		let stripped = content.replace(/(?:<(figcaption)[^>]*?>.*?<\/\1>|<.*?>|(?:^|\n)>)/g, '').trim();
		let desc = stripped.match(/[^\n]+/g)[0];
		if (desc && desc.length > 200) desc = desc.slice(0, 199) + '…';
		meta.description = desc;
	}
	if (
		meta.published &&
		meta.updated &&
		meta.published.replace(/:\d\d:\d\d/, '') === meta.updated.replace(/:\d\d:\d\d/, '')
	)
		delete meta.updated;
	if (meta.description === meta.meta_description) delete meta.meta_description;
	if (meta.title === meta.meta_title) delete meta.meta_title;
	for (let i in meta) if (i[0] === '.' || i[0] === '_') delete meta[i];
	return meta;
}

function decodeHtmlEntities(html) {
	return html.replace(/&(?:#(\d+)|times|apos|quot|amp);/g, (s, n, t) => {
		switch (t) {
			case 'times':
				return '×';
			case 'apos':
				return 'ʼ';
			case 'quot':
				return '"';
			case 'amp':
				return '&';
		}
		return String.fromCharCode(n);
	});
}

/**
 *  markdown blog/content plugin for Rollup / WMR
 */
function contentRollupPlugin({ cwd, prod, ...opts }) {
	return {
		name: 'content',
		async resolveId(id, importer) {
			if (id[0] === '\0' || !id.startsWith('content:')) return;
			id = id.slice(8);
			if (importer) importer = importer.replace(/^[\0\b]\w+:/g, '');
			let resolved = await this.resolve(id, importer, { skipSelf: true });
			if (!resolved) {
				const r = path.join(path.dirname(importer), id);
				const s = await fs.stat(r).catch(() => null);
				if (s && s.isDirectory()) resolved = { id: r };
			}
			if (resolved) return '\0content:' + resolved.id.replace(/\/\.$/, '');
		},
		async load(id) {
			if (!id.startsWith('\0content:')) return;
			id = path.resolve(cwd || '.', id.slice(9));
			const files = (await tree(id)).filter(file => file.endsWith('.md'));
			const data = await Promise.all(
				files.map(async file => {
					const { slug, ...meta } = await getMeta(path.resolve(id, file));
					return { name: slug || file.replace(/\.md$/, ''), ...meta };
				})
			);
			data.sort((a, b) => +new Date(b.published) - +new Date(a.published));

			let imports = '';

			const serializeItem = item => {
				const url = 'markdown:./' + path.posix.relative(path.dirname(id), path.resolve(id, item.name)) + '.md';
				imports += `import ${JSON.stringify(url)};\n`;

				let str = '{ ';
				for (let i in item) if (item[i] != null) str += `${i}: ${JSON.stringify(item[i])}, `;
				return str + '}';
			};

			const code = 'export default [' + data.map(serializeItem).join(',\n') + '];';
			return imports + code;
		}
	};
}
