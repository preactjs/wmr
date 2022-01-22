import path from 'path';
import { getPackageInfo, isValidPackageName } from '../plugins/npm-plugin/utils.js';

export function npmEtagCache() {
	return async (req, res, next) => {
		const url = new URL(req.url, 'https://localhost');
		let id = path.posix.normalize(url.pathname);

		if (!id.startsWith('/@npm/')) {
			return next();
		}

		id = id.slice('/@npm/'.length);
		if (!isValidPackageName(id)) {
			return next();
		}

		const { name, version, pathname } = getPackageInfo(id);

		try {
			// The package name + version + pathname is a strong ETag since versions are immutablew
			const etag = Buffer.from(`${name}${version}${pathname}`).toString('base64');
			const ifNoneMatch = String(req.headers['if-none-match']).replace(/-(gz|br)$/g, '');

			if (ifNoneMatch === etag) {
				return res.writeHead(304).end();
			}

			res.setHeader('etag', etag);
		} catch (err) {
			next(err);
		}

		next();
	};
}
