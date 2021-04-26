import { promises as fs } from 'fs';
import path from 'path';

/**
 * Traverse the pages directory and retrieve all routes.
 * @param {string} root Directory to start search from
 * @param {string} [dir]
 */
async function readRecursive(root, dir = root) {
	const mixed = await fs.readdir(dir);

	/** @type {string[]} */
	const routes = [];

	await Promise.all(
		mixed.map(async fileOrDir => {
			const absolute = path.join(dir, fileOrDir);
			if (/\.[tj]sx?$/.test(fileOrDir)) {
				const name = path.basename(fileOrDir, path.extname(fileOrDir));
				const routePath = name === 'index' ? path.relative(root, dir) : path.relative(root, path.join(dir, name));
				routes.push(routePath);
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
 * @param {string} options.pagesDir Controls whether files are processed to transform JSX.
 * @param {string} options.cwd
 * @param {string} options.publicPath
 * @returns {import('wmr').Plugin}
 */
export default function fsRoutesPlugin({ pagesDir, publicPath, cwd }) {
	const PUBLIC = 'builtins:fs-routes';
	const INTERNAL = '\0builtins:fs-routes';
	return {
		name: 'fs-router',
		resolveId(id) {
			if (id === PUBLIC) {
				return INTERNAL;
			}
		},
		async load(id) {
			if (id !== INTERNAL) return;

			const rawRoutes = await readRecursive(pagesDir);

			const routes = rawRoutes.map(raw => {
				const url = '/' + raw.split(path.sep).join(path.posix.sep);
				const route = url.replace(/\[(\w+)\]/g, (m, g) => `:${g}`);
				return { url, route };
			});

			const base = path.join(cwd, path.relative(cwd, pagesDir)).split(path.sep).join(path.posix.sep);

			console.log(base, cwd);

			const routesStr = routes
				.map(route => {
					return `{
          route: ${JSON.stringify(route.route)},
          load: () => import("${base}${route.url}")
        }`;
				})
				.join(', ');

			console.log(routesStr);

			return `export const routes = [${routesStr}]`;
		},
		transform(code, id) {
			if (id !== INTERNAL) return;

			console.log(code);
		}
	};
}
