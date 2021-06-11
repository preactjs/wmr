import marked from 'marked';
import yaml from 'yaml';
import { promises as fs } from 'fs';
import path from 'path';

// Custom renderer that appends links to headings
marked.use({
	renderer: {
		heading(text, level) {
			if (level === 1) {
				return `<h1>${text}</h1>`;
			}

			const escapedText = text
				.toLowerCase()
				.replace(/<[^>]*>/g, '')
				.replace(/[^\w]+/g, '-')
				.replace(/[-]+$/g, '');

			return `<h${level} id="${escapedText}">
			<a class="anchor" href="#${escapedText}">#</a>
			${text}
		</h${level}>`;
		}
	}
});

export default function markdownPlugin({ plugins, root, prod }, opts) {
	plugins.push(markdownRollupPlugin({ root, prod, ...opts }));
}
markdownPlugin.rollup = markdownRollupPlugin;

const FRONT_MATTER_REG = /^\s*---\n\s*([\s\S]*?)\s*\n---\n/i;
const TITLE_REG = /^\s*#\s+(.+)\n+/;
async function processMarkdown(filename, opts) {
	let meta = {};
	let content = await fs.readFile(filename, 'utf-8');
	content = content.replace(FRONT_MATTER_REG, (s, fm) => {
		meta = yaml.parse('---\n' + fm.replace(/^/gm, '  ') + '\n') || meta;
		return '';
	});
	// infer title if not specified:
	content = content.replace(TITLE_REG, s => {
		if (!meta.title) {
			meta.title = s;
		}
		// if (meta.title.toLowerCase().trim() === s.toLowerCase().trim()) return '';
		return s;
	});
	content = `# ${meta.title}${content}`;
	// "HTML with JSON frontmatter":
	return '<!--' + JSON.stringify(meta) + '-->\n' + marked(content, opts);
}

/**
 *  markdown plugin for Rollup / WMR
 *  @example import html from 'markdown:./pages';
 */
function markdownRollupPlugin({ root, prod, ...opts }) {
	return {
		name: 'markdown',
		async resolveId(id, importer) {
			if (id[0] === '\0') return;
			if (id.startsWith('markdown:')) id = id.slice(9);
			else if (!id.endsWith('.md')) return;
			if (importer) importer = importer.replace(/^[\0\b]\w+:/g, '');
			return `\0markdown:${path.join(path.dirname(importer), id)}`;
		},
		async load(id) {
			if (!id.startsWith('\0markdown:')) return;
			id = path.resolve(root || '.', id.slice(10));
			this.addWatchFile(id);

			const fileId = this.emitFile({
				type: 'asset',
				name: path.relative(root || '.', id),
				fileName: path.relative(root || '.', id),
				source: await processMarkdown(id, opts)
			});
			return `export default import.meta.ROLLUP_FILE_URL_${fileId}`;
		}
	};
}
