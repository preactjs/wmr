import * as kl from 'kolorist';
import { createCodeFrame } from 'simple-code-frame';
import * as util from 'util';
import path from 'path';

/**
 * @param {import('rollup').RollupOutput} bundle
 * @param {string} outDir
 */
export function bundleStats(bundle, outDir) {
	let total = 0;
	const assets = bundle.output
		.filter(asset => !/\.map$/.test(asset.fileName))
		.sort((a, b) => scoreAsset(b) - scoreAsset(a));

	let nonCssAsset = false;
	const assetsText = assets.reduce((str, output) => {
		// TODO: group output and bring back asset sizes
		if (!nonCssAsset && output.type === 'asset' && !/\.(css|html)/.test(output.fileName)) {
			str += '\n';
			nonCssAsset = true;
		}

		const content = output.type === 'asset' ? output.source : output.code;
		const size = content.length;
		total += content.length;
		let sizeText = prettyBytes(size);
		if (size > 50e3) sizeText = kl.lightRed(sizeText);
		else if (size > 10e3) sizeText = kl.lightYellow(sizeText);
		else if (size > 5e3) sizeText = kl.lightBlue(sizeText);
		else sizeText = kl.lightGreen(sizeText);

		let { fileName } = output;
		fileName = fileName.endsWith('.js')
			? kl.cyan(fileName)
			: fileName.endsWith('.css')
			? kl.magenta(fileName)
			: fileName;
		return `${str}\n  ${kl.dim(outDir + path.sep)}${fileName} ${sizeText}`;
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
	// ...then CSS files
	else if (/\.css$/.test(asset.fileName)) {
		return 10;
	}

	// ...and everything else after that
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

/**
 * Print source code with line numbers and error location pointer.
 * @param {string} code
 * @param {{ line: number, column: number } | number} loc A source position, or character offset within `code`.
 * @param {object} [options]
 * @param {number} [options.before] Lines to show before error line
 * @param {number} [options.after] Lines to show after error line
 */
export function codeFrame(code, loc, { before = 2, after = 3 } = {}) {
	let line, column;
	if (typeof loc === 'number') {
		let before = code.substring(0, loc).split('\n');
		line = before.length;
		column = before[before.length - 1].length;
	} else {
		({ line, column } = loc);
	}

	return createCodeFrame(code, line - 1, column, { before, after, colors: true });
}

// Taken from https://github.com/visionmedia/debug/blob/e47f96de3de5921584364b4ac91e2769d22a3b1f/src/node.js#L35
// prettier-ignore
const colors = [
	20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68,
	69, 74, 75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134,
	135, 148, 149, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171,
	172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201, 202, 203, 204,
	205, 206, 207, 208, 209, 214, 215, 220, 221
];

// Taken from: https://github.com/visionmedia/debug/blob/e47f96de3de5921584364b4ac91e2769d22a3b1f/src/common.js#L41-L50
function selectColor(namespace) {
	let hash = 0;

	for (let i = 0; i < namespace.length; i++) {
		hash = (hash << 5) - hash + namespace.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}

	return colors[Math.abs(hash) % colors.length];
}

let debugCliArg = false;

/**
 * @param {boolean} enabled
 */
export function setDebugCliArg(enabled) {
	debugCliArg = enabled;
}

export function hasDebugFlag() {
	return process.env.DEBUG === 'true' || process.env.DEBUG === '1' || debugCliArg;
}

/**
 * Print namespaced log messages when the DEBUG environment
 * variable is set.
 * @param {string} namespace
 * @param {number} [color]
 * @returns {(...args: any[]) => void}
 */
export function debug(namespace, color = selectColor(namespace)) {
	const ns = kl.ansi256(color)(`  ${namespace}  `);
	return (...args) => {
		if (hasDebugFlag()) {
			const str = args.map(arg => {
				const value = arg === null || typeof arg !== 'object' ? arg : util.inspect(arg, false, null, true);

				return value
					.split('\n')
					.map(line => ns + line)
					.join('\n');
			});
			console.log.apply(console, str);
		}
	};
}

/**
 * Serialize path to display special characters such as
 * the null byte of necessary.
 * @param {string} path
 * @returns {string}
 */
export function formatPath(path) {
	path = path || 'null';
	if (typeof path === 'object') {
		path = path.id;
	}
	if (path.startsWith('\0')) {
		path = JSON.stringify(path);
	}

	return path;
}

/**
 * @param {string} from
 * @param {import('rollup').ResolvedId | string | null} to
 */
export function formatResolved(from, to) {
	from = formatPath(from);
	to = formatPath(to);
	return `${kl.cyan(from)} -> ${kl.dim(to)}`;
}

/**
 * @param {string} addr
 */
function formatAddr(addr) {
	return kl.cyan(addr.replace(/:(\d+)$/, m => ':' + kl.bold(m.slice(1))));
}

/**
 * @param {string} message
 * @param {string[]} addresses
 * @returns {string}
 */
export function formatBootMessage(message, addresses) {
	const intro = `\n  👩‍🚀 ${kl.lightYellow('WMR')} ${message}\n\n`;
	const local = `  ${kl.dim('Local:')}   ${formatAddr(addresses[0])}\n`;

	let network = kl.dim(`  Network: (disabled, see --host)\n`);
	if (addresses.length > 1) {
		network =
			addresses
				.slice(1)
				.map(addr => `  ${kl.dim('Network:')} ${formatAddr(addr)}`)
				.join('\n') + '\n';
	}

	return `${intro}${local}${network}\n`;
}
