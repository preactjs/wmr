import { promises as fs } from 'fs';
import path from 'path';
import { toPosix } from './plugin-utils.js';

/**
 * Traverse the pages directory and retrieve all routes.
 * @param {string} root Directory to start search from
 * @param {string} [dir]
 */
async function readRecursive(root, dir = root) {
	const mixed = await fs.readdir(dir);

	/** @type {{ route: string, url: string }[]} */
	const routes = [];

	await Promise.all(
		mixed.map(async fileOrDir => {
			const absolute = path.join(dir, fileOrDir);
			if (/\.[tj]sx?$/.test(fileOrDir)) {
				const name = path.basename(fileOrDir, path.extname(fileOrDir));
				const routePath = name === 'index' ? path.relative(root, dir) : path.relative(root, path.join(dir, name));
				routes.push({
					route: '/' + toPosix(routePath.replace(/\[(\w+)\]/g, (m, g) => `:${g}`)),
					url: '/' + toPosix(path.relative(root, path.join(dir, fileOrDir)))
				});
			}

			const stats = await fs.lstat(absolute);
			if (stats.isDirectory()) {
				routes.push(...(await readRecursive(root, absolute)));
			}
		})
	);

	return routes;
}

/**
 * Convert JSX to HTM
 * @param {object} options
 * @param {string} options.routesDir Controls whether files are processed to transform JSX.
 * @param {string} options.cwd
 * @param {string} options.root
 * @param {string} options.publicPath
 * @returns {import('wmr').Plugin}
 */
export default function fsRoutesPlugin({ routesDir, publicPath, root, cwd }) {
	const PUBLIC = 'wmr:fs-routes';
	const INTERNAL = '\0wmr:fs-routes';
	return {
		name: 'fs-routes',
		resolveId(id) {
			if (id === PUBLIC) {
				return INTERNAL;
			}
		},
		async load(id) {
			if (id !== INTERNAL) return;

			const routes = await readRecursive(routesDir);
			const base = toPosix(path.relative(cwd, path.join(root, routesDir)));

			const routesStr = routes
				.map(route => {
					return `{
          route: ${JSON.stringify(route.route)},
          load: () => import("${publicPath}${base}${route.url}")
        }`;
				})
				.join(', ');

			console.log(routesStr);

			return `export const routes = [${routesStr}]`;
		}
	};
}
