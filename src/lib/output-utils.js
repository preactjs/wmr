import * as kl from 'kolorist';

/** @param {import('rollup').RollupOutput} bundle */
export function bundleStats(bundle) {
	let total = 0;
	const assets = bundle.output
		.filter(asset => !/\.map$/.test(asset.fileName))
		.sort((a, b) => scoreAsset(b) - scoreAsset(a));

	const assetsText = assets.reduce((str, output) => {
		// TODO: group output and bring back asset sizes
		if (output.type === 'asset' && !/\.(css|html)/.test(output.fileName)) return str;

		const content = output.type === 'asset' ? output.source : output.code;
		const size = content.length;
		total += content.length;
		let sizeText = prettyBytes(size);
		if (size > 50e3) sizeText = kl.lightRed(sizeText);
		else if (size > 10e3) sizeText = kl.lightYellow(sizeText);
		else if (size > 5e3) sizeText = kl.lightBlue(sizeText);
		else sizeText = kl.lightGreen(sizeText);
		return `${str}\n  ${output.fileName} ${sizeText}`;
	}, '');

	const totalText = prettyBytes(total);

	return { assets, total, totalText, assetsText };
}

/** @param {import('rollup').OutputChunk | import('rollup').OutputAsset} asset */
function scoreAsset(asset) {
	if (asset.type === 'chunk') {
		return asset.isEntry ? 10 : asset.isDynamicEntry ? 8 : 6;
	}
	// List HTML files first, sorted by path depth
	if (/\.html$/.test(asset.fileName)) {
		return 30 - asset.fileName.split('/').length;
	}
	return 1;
}

/** @param {number} size */
export function prettyBytes(size) {
	let unit = 'b';
	if (size > 1500) {
		size /= 1000;
		unit = 'Kb';
	}
	if (size > 1500) {
		size /= 1000;
		unit = 'Mb';
	}
	return `${size < 1 ? size.toFixed(2) : size < 10 ? size.toFixed(1) : size | 0}${unit}`;
}

// normalize tab characters for CLI printing
const normalize = str => str.replace(/^\t/g, '  ');

/**
 * Print source code with line numbers and error location pointer.
 * @param {string} code
 * @param {{ line: number, column: number } | number} loc A source position, or character offset within `code`.
 */
export function codeFrame(code, loc) {
	let line, column;
	if (typeof loc === 'number') {
		let before = code.substring(0, loc).split('\n');
		line = before.length;
		column = before[before.length - 1].length;
	} else {
		({ line, column } = loc);
	}
	const lines = code.split('\n');
	const len = String(line).length + 2;
	const pad = str => String(str).padStart(len);
	let frame = '';
	if (line > 1) {
		frame += `\n${kl.dim(pad(line - 2) + ' |')} ${normalize(lines[line - 2])}`;
	}
	frame += `\n${kl.dim(pad(line - 1) + ' |')} ${normalize(lines[line - 1])}`;
	const offsetCol = normalize(lines[line - 1].substring(0, column)).length;
	frame += '\n' + kl.yellow('-'.repeat(len + 3 + offsetCol) + '^');
	if (line < lines.length) {
		frame += `\n${kl.dim(pad(line) + ' |')} ${normalize(lines[line])}`;
	}
	return frame;
}
